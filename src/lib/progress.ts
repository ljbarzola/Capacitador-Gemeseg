import "server-only";
import { cache } from "react";
import type { AttendanceStatus, LessonType, Progression } from "@/generated/prisma/client";
import { issueCertificate, issueModuleCertificate } from "@/lib/certificates";
import { getPrisma } from "@/lib/prisma";
import { countsAsDone } from "@/lib/sessions";

// Un curso se recorre como una lista plana de "ítems": las lecciones de cada submódulo en
// orden y, si el submódulo tiene examen con preguntas, el examen al final de sus lecciones.
// Un ítem está hecho si la lección se marcó como completada o si el examen se aprobó. Una sesión
// en vivo está hecha si el instructor marcó "Asistió" o "Justificada" (en el ciclo actual).
// En progresión SECUENCIAL solo es accesible si todos los anteriores están hechos, salvo las
// sesiones en vivo: siempre son accesibles y nunca bloquean lo que sigue.
//
// Además, la persona avanza de un módulo a la vez (en todos los cursos). El módulo actual es el
// primero que todavía no finalizó; al terminar sus actividades pulsa «Finalizar módulo»
// (ModuleCompletion) y pasa al siguiente. Los módulos finalizados se pueden volver a abrir para
// repasar; los pendientes que vienen después del actual quedan con candado (`locked`) y no se abren,
// ni por la lista ni escribiendo la dirección. En vista previa (userId null) todo queda libre.

export type OutlineItem = {
  kind: "lesson" | "quiz";
  key: string; // "lesson:<id>" | "quiz:<submoduleId>"
  id: string; // id de la lección, o del submódulo para el examen
  title: string;
  submoduleId: string;
  moduleId: string;
  lessonType?: LessonType;
  startsAt?: Date; // solo sesiones en vivo
  attendance?: AttendanceStatus | null; // solo sesiones en vivo
  done: boolean;
  accessible: boolean;
};

export type OutlineModule = {
  id: string;
  title: string;
  issuesCertificate: boolean;
  submodules: { id: string; title: string; items: OutlineItem[] }[];
  empty: boolean; // sin actividades: se omite (no se muestra ni certifica)
  ready: boolean; // terminó todo lo que depende de la persona: puede pulsar «Finalizar módulo»
  finalized: boolean;
  // Finalizado por avance anterior a que existiera el botón: falta guardarlo y certificarlo.
  legacy: boolean;
  // Pendiente y posterior al módulo actual: aparece en la lista con candado y no se puede abrir.
  locked: boolean;
};

export type Outline = {
  course: {
    id: string;
    title: string;
    description: string | null;
    progression: Progression;
    published: boolean;
  };
  modules: OutlineModule[];
  currentModuleId: string | null; // módulo en el que está la persona (null en vista previa)
  items: OutlineItem[];
  total: number;
  completed: number;
  percent: number;
  complete: boolean;
  next: OutlineItem | null; // primer ítem pendiente y accesible
};

const byOrder = [{ order: "asc" as const }, { id: "asc" as const }];

// userId = null: vista previa (nada hecho, todo accesible).
export async function getOutline(courseId: string, userId: string | null): Promise<Outline | null> {
  const prisma = getPrisma();
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      description: true,
      progression: true,
      published: true,
      modules: {
        orderBy: byOrder,
        select: {
          id: true,
          title: true,
          issuesCertificate: true,
          submodules: {
            orderBy: byOrder,
            select: {
              id: true,
              title: true,
              lessons: { orderBy: byOrder, select: { id: true, title: true, type: true, startsAt: true } },
              quiz: { select: { id: true, _count: { select: { questions: true } } } },
            },
          },
        },
      },
    },
  });
  if (!course) return null;

  const lessonIds = course.modules.flatMap((m) => m.submodules.flatMap((s) => s.lessons.map((l) => l.id)));
  const quizIds = course.modules.flatMap((m) =>
    m.submodules.flatMap((s) => (s.quiz && s.quiz._count.questions > 0 ? [s.quiz.id] : [])),
  );

  const sessionIds = course.modules.flatMap((m) =>
    m.submodules.flatMap((s) => s.lessons.filter((l) => l.type === "SESSION").map((l) => l.id)),
  );

  let doneLessons = new Set<string>();
  let passedQuizzes = new Set<string>();
  let finishedModules = new Set<string>();
  let enrollmentCompleted = false;
  const attendance = new Map<string, AttendanceStatus>();
  if (userId) {
    // Solo cuenta el avance posterior al inicio del ciclo actual (cambia al recertificar).
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { cycleStartedAt: true, status: true },
    });
    const since = enrollment?.cycleStartedAt ?? new Date(0);
    enrollmentCompleted = enrollment?.status === "COMPLETED";
    const [progress, attempts, marks, finished] = await Promise.all([
      prisma.lessonProgress.findMany({
        where: { userId, lessonId: { in: lessonIds }, completedAt: { gte: since } },
        select: { lessonId: true },
      }),
      prisma.quizAttempt.findMany({
        where: { userId, passed: true, quizId: { in: quizIds }, finishedAt: { gte: since } },
        select: { quizId: true },
        distinct: ["quizId"],
      }),
      sessionIds.length
        ? prisma.sessionAttendance.findMany({
            where: { userId, lessonId: { in: sessionIds }, markedAt: { gte: since } },
            select: { lessonId: true, status: true },
          })
        : Promise.resolve([]),
      prisma.moduleCompletion.findMany({
        where: { userId, moduleId: { in: course.modules.map((m) => m.id) }, completedAt: { gte: since } },
        select: { moduleId: true },
      }),
    ]);
    for (const m of marks) attendance.set(m.lessonId, m.status);
    doneLessons = new Set(progress.map((p) => p.lessonId));
    passedQuizzes = new Set(attempts.map((a) => a.quizId));
    finishedModules = new Set(finished.map((f) => f.moduleId));
  }

  const sequential = userId !== null && course.progression === "SEQUENTIAL";
  const items: OutlineItem[] = [];
  let previousDone = true;

  // gate = false: la sesión en vivo siempre es accesible y no condiciona a los ítems siguientes.
  const push = (item: Omit<OutlineItem, "accessible">, gate = true) => {
    const accessible = !gate || !sequential || previousDone;
    const full = { ...item, accessible };
    items.push(full);
    if (gate) previousDone = previousDone && item.done;
    return full;
  };

  const built = course.modules.map((module) => ({
    id: module.id,
    title: module.title,
    issuesCertificate: module.issuesCertificate,
    submodules: module.submodules.map((submodule) => {
      const subItems: OutlineItem[] = submodule.lessons.map((lesson) => {
        if (lesson.type === "SESSION") {
          const status = attendance.get(lesson.id) ?? null;
          return push(
            {
              kind: "lesson",
              key: `lesson:${lesson.id}`,
              id: lesson.id,
              title: lesson.title,
              submoduleId: submodule.id,
              moduleId: module.id,
              lessonType: lesson.type,
              startsAt: lesson.startsAt ?? undefined,
              attendance: status,
              done: countsAsDone(status),
            },
            false,
          );
        }
        return push({
          kind: "lesson",
          key: `lesson:${lesson.id}`,
          id: lesson.id,
          title: lesson.title,
          submoduleId: submodule.id,
          moduleId: module.id,
          lessonType: lesson.type,
          done: doneLessons.has(lesson.id),
        });
      });
      if (submodule.quiz && submodule.quiz._count.questions > 0) {
        subItems.push(
          push({
            kind: "quiz",
            key: `quiz:${submodule.id}`,
            id: submodule.id,
            title: `Examen: ${submodule.title}`,
            submoduleId: submodule.id,
            moduleId: module.id,
            done: passedQuizzes.has(submodule.quiz.id),
          }),
        );
      }
      return { id: submodule.id, title: submodule.title, items: subItems };
    }),
  }));

  // Estado de cada módulo (solo para una persona inscrita; en vista previa todo queda libre).
  const itemsOf = (module: (typeof built)[number]) => module.submodules.flatMap((s) => s.items);
  const states = built.map((module, index) => {
    const own = itemsOf(module);
    const empty = own.length === 0;
    // Las sesiones en vivo no bloquean: dependen del instructor, no de la persona.
    const ready = !empty && own.every((i) => i.lessonType === "SESSION" || i.done);
    const later = built.slice(index + 1).some((m) => itemsOf(m).some((i) => i.done));
    const recorded = finishedModules.has(module.id);
    // Quien ya estaba avanzado antes de existir el botón: sus módulos terminados cuentan como
    // finalizados si siguió con otro módulo o completó el curso.
    const legacy = userId !== null && !recorded && ready && (later || enrollmentCompleted);
    // Si el instructor agrega contenido a un módulo ya finalizado, se reabre (deja de estar «ready»)
    // y la persona debe completar lo nuevo y volver a finalizarlo; así nunca queda atascada.
    return { empty, ready, legacy, finalized: userId !== null && (empty || (recorded && ready) || legacy) };
  });

  // Las sesiones en vivo son formativas: no cuentan en el avance ni impiden completar el curso (el
  // instructor registra su asistencia aparte). El curso se completa al finalizar todos los módulos.
  const counted = items.filter((i) => i.lessonType !== "SESSION");
  const completed = counted.filter((i) => i.done).length;
  const complete = items.length > 0 && completed === counted.length && states.every((s) => s.finalized);
  // Módulo actual: el primero sin finalizar; si ya finalizó todos (le faltan solo sesiones por
  // registrar) se queda en el último con actividades.
  const firstOpen = states.findIndex((s) => !s.finalized);
  const lastWithItems = [...built.keys()].reverse().find((i) => !states[i].empty) ?? -1;
  const currentIndex = userId === null ? -1 : firstOpen >= 0 ? firstOpen : lastWithItems;
  const currentModuleId = currentIndex >= 0 ? built[currentIndex].id : null;

  const modules: OutlineModule[] = built.map((module, index) => {
    const state = states[index];
    const locked = userId !== null && !state.empty && !state.finalized && index !== currentIndex;
    if (locked) {
      // Módulo pendiente posterior al actual: nada de él se puede abrir (ni por URL).
      for (const item of itemsOf(module)) item.accessible = false;
    } else if (userId !== null && state.finalized) {
      // Módulo finalizado: se puede repasar completo, aunque otro anterior se haya reabierto.
      for (const item of itemsOf(module)) item.accessible = true;
    }
    return { ...module, ...state, locked };
  });

  return {
    course: {
      id: course.id,
      title: course.title,
      description: course.description,
      progression: course.progression,
      published: course.published,
    },
    modules,
    currentModuleId,
    items,
    total: counted.length,
    completed,
    percent: counted.length === 0 ? 0 : Math.round((completed / counted.length) * 100),
    complete,
    // "Continuar" lleva primero al contenido pendiente; las sesiones pendientes quedan para el final
    // porque dependen de la fecha y de que el instructor marque la asistencia.
    next:
      items.find((i) => !i.done && i.accessible && i.lessonType !== "SESSION") ??
      items.find((i) => !i.done && i.accessible) ??
      null,
  };
}

// Misma consulta, memorizada durante un mismo render (layout + página no la repiten).
export const getOutlineCached = cache(getOutline);

// Registra como finalizados (y certifica) los módulos que la persona ya había terminado antes de
// que existiera el botón «Finalizar módulo». Es idempotente y no hace nada en el caso normal.
export async function persistLegacyModules(userId: string, courseId: string, outline: Outline) {
  const legacy = outline.modules.filter((m) => m.legacy);
  if (legacy.length === 0) return;
  const prisma = getPrisma();
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: { id: true },
  });
  if (!enrollment) return;
  for (const entry of legacy) {
    await prisma.moduleCompletion.upsert({
      where: { userId_moduleId: { userId, moduleId: entry.id } },
      create: { userId, moduleId: entry.id },
      update: { completedAt: new Date() }, // la marca de un ciclo anterior ya no cuenta
    });
    await issueModuleCertificate(enrollment.id, entry.id);
  }
}

// Actualiza el estado de la inscripción según el avance (ASSIGNED → IN_PROGRESS → COMPLETED).
export async function syncEnrollment(userId: string, courseId: string) {
  const prisma = getPrisma();
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (!enrollment) return null;
  let outline = await getOutline(courseId, userId);
  if (!outline) return enrollment;

  // Un módulo se finaliza solo cuando la persona termina todo lo suyo (lecciones y exámenes; las
  // sesiones en vivo no cuentan): se registra, se emite su certificado y se abre el siguiente.
  // Se repite por si el siguiente módulo ya estaba listo (p. ej. solo tiene sesiones en vivo).
  for (let guard = 0; guard < 50 && outline; guard++) {
    const target = outline.modules.find((m) => m.id === outline!.currentModuleId);
    if (!target || !target.ready || target.finalized) break;
    await prisma.moduleCompletion.upsert({
      where: { userId_moduleId: { userId, moduleId: target.id } },
      create: { userId, moduleId: target.id },
      update: { completedAt: new Date() }, // la marca de un ciclo anterior ya no cuenta
    });
    await issueModuleCertificate(enrollment.id, target.id);
    outline = await getOutline(courseId, userId);
  }
  if (!outline) return enrollment;

  const status = outline.complete ? "COMPLETED" : outline.completed > 0 ? "IN_PROGRESS" : "ASSIGNED";
  if (status === enrollment.status) {
    // Cubre cursos completados antes de que existieran los certificados.
    if (status === "COMPLETED") await issueCertificate(enrollment.id);
    return enrollment;
  }
  const updated = await prisma.enrollment.update({
    where: { id: enrollment.id },
    data: { status, completedAt: status === "COMPLETED" ? new Date() : null },
  });
  if (status === "COMPLETED") await issueCertificate(enrollment.id);
  return updated;
}

// Recalcula varias inscripciones con concurrencia limitada (marcas masivas de asistencia: 200 a 500
// personas deben resolverse en pocos segundos sin saturar la base de datos).
export async function syncEnrollments(courseId: string, userIds: string[], concurrency = 10) {
  for (let i = 0; i < userIds.length; i += concurrency) {
    await Promise.all(userIds.slice(i, i + concurrency).map((id) => syncEnrollment(id, courseId)));
  }
}

// Avance de varias inscripciones de un curso (para listados), respetando el ciclo de cada una.
export async function getProgressForEnrollments(
  courseId: string,
  enrollments: { userId: string; cycleStartedAt: Date }[],
) {
  const prisma = getPrisma();
  const userIds = enrollments.map((e) => e.userId);
  const [lessonCount, quizzes] = await Promise.all([
    prisma.lesson.count({ where: { type: { not: "SESSION" }, submodule: { module: { courseId } } } }),
    prisma.quiz.findMany({
      where: { submodule: { module: { courseId } }, questions: { some: {} } },
      select: { id: true },
    }),
  ]);
  const total = lessonCount + quizzes.length;

  const [lessons, attempts] = await Promise.all([
    prisma.lessonProgress.findMany({
      where: { userId: { in: userIds }, lesson: { submodule: { module: { courseId } } } },
      select: { userId: true, completedAt: true },
    }),
    prisma.quizAttempt.findMany({
      where: { userId: { in: userIds }, passed: true, quizId: { in: quizzes.map((q) => q.id) } },
      select: { userId: true, quizId: true, finishedAt: true },
    }),
  ]);

  const since = new Map(enrollments.map((e) => [e.userId, e.cycleStartedAt]));
  const done = new Map<string, number>();
  for (const row of lessons) {
    if (row.completedAt >= (since.get(row.userId) ?? new Date(0))) done.set(row.userId, (done.get(row.userId) ?? 0) + 1);
  }
  const seen = new Set<string>();
  for (const row of attempts) {
    const key = `${row.userId}:${row.quizId}`;
    if (seen.has(key) || row.finishedAt < (since.get(row.userId) ?? new Date(0))) continue;
    seen.add(key);
    done.set(row.userId, (done.get(row.userId) ?? 0) + 1);
  }

  return new Map(
    userIds.map((id) => {
      const completed = Math.min(done.get(id) ?? 0, total);
      return [id, { completed, total, percent: total === 0 ? 0 : Math.round((completed / total) * 100) }] as const;
    }),
  );
}
