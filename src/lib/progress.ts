import "server-only";
import { cache } from "react";
import type { AttendanceStatus, LessonType, Progression } from "@/generated/prisma/client";
import { issueCertificate } from "@/lib/certificates";
import { getPrisma } from "@/lib/prisma";
import { countsAsDone } from "@/lib/sessions";

// Un curso se recorre como una lista plana de "ítems": las lecciones de cada submódulo en
// orden y, si el submódulo tiene examen con preguntas, el examen al final de sus lecciones.
// Un ítem está hecho si la lección se marcó como completada o si el examen se aprobó. Una sesión
// en vivo está hecha si el instructor marcó "Asistió" o "Justificada" (en el ciclo actual).
// En progresión SECUENCIAL solo es accesible si todos los anteriores están hechos, salvo las
// sesiones en vivo: siempre son accesibles y nunca bloquean lo que sigue.

export type OutlineItem = {
  kind: "lesson" | "quiz";
  key: string; // "lesson:<id>" | "quiz:<submoduleId>"
  id: string; // id de la lección, o del submódulo para el examen
  title: string;
  submoduleId: string;
  lessonType?: LessonType;
  startsAt?: Date; // solo sesiones en vivo
  attendance?: AttendanceStatus | null; // solo sesiones en vivo
  done: boolean;
  accessible: boolean;
};

export type Outline = {
  course: {
    id: string;
    title: string;
    description: string | null;
    progression: Progression;
    published: boolean;
  };
  modules: {
    id: string;
    title: string;
    submodules: { id: string; title: string; items: OutlineItem[] }[];
  }[];
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
  const attendance = new Map<string, AttendanceStatus>();
  if (userId) {
    // Solo cuenta el avance posterior al inicio del ciclo actual (cambia al recertificar).
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { cycleStartedAt: true },
    });
    const since = enrollment?.cycleStartedAt ?? new Date(0);
    const [progress, attempts, marks] = await Promise.all([
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
    ]);
    for (const m of marks) attendance.set(m.lessonId, m.status);
    doneLessons = new Set(progress.map((p) => p.lessonId));
    passedQuizzes = new Set(attempts.map((a) => a.quizId));
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

  const modules = course.modules.map((module) => ({
    id: module.id,
    title: module.title,
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
            done: passedQuizzes.has(submodule.quiz.id),
          }),
        );
      }
      return { id: submodule.id, title: submodule.title, items: subItems };
    }),
  }));

  const completed = items.filter((i) => i.done).length;
  return {
    course: {
      id: course.id,
      title: course.title,
      description: course.description,
      progression: course.progression,
      published: course.published,
    },
    modules,
    items,
    total: items.length,
    completed,
    percent: items.length === 0 ? 0 : Math.round((completed / items.length) * 100),
    complete: items.length > 0 && completed === items.length,
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

// Actualiza el estado de la inscripción según el avance (ASSIGNED → IN_PROGRESS → COMPLETED).
export async function syncEnrollment(userId: string, courseId: string) {
  const prisma = getPrisma();
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (!enrollment) return null;
  const outline = await getOutline(courseId, userId);
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
    prisma.lesson.count({ where: { submodule: { module: { courseId } } } }),
    prisma.quiz.findMany({
      where: { submodule: { module: { courseId } }, questions: { some: {} } },
      select: { id: true },
    }),
  ]);
  const total = lessonCount + quizzes.length;

  const [lessons, attempts, marks] = await Promise.all([
    prisma.lessonProgress.findMany({
      where: { userId: { in: userIds }, lesson: { submodule: { module: { courseId } } } },
      select: { userId: true, completedAt: true },
    }),
    prisma.quizAttempt.findMany({
      where: { userId: { in: userIds }, passed: true, quizId: { in: quizzes.map((q) => q.id) } },
      select: { userId: true, quizId: true, finishedAt: true },
    }),
    prisma.sessionAttendance.findMany({
      where: {
        userId: { in: userIds },
        status: { in: ["ATTENDED", "EXCUSED"] },
        lesson: { submodule: { module: { courseId } } },
      },
      select: { userId: true, markedAt: true },
    }),
  ]);

  const since = new Map(enrollments.map((e) => [e.userId, e.cycleStartedAt]));
  const doneSessions = new Map<string, number>();
  for (const row of marks) {
    if (row.markedAt >= (since.get(row.userId) ?? new Date(0))) doneSessions.set(row.userId, (doneSessions.get(row.userId) ?? 0) + 1);
  }
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
      const completed = Math.min((done.get(id) ?? 0) + (doneSessions.get(id) ?? 0), total);
      return [id, { completed, total, percent: total === 0 ? 0 : Math.round((completed / total) * 100) }] as const;
    }),
  );
}
