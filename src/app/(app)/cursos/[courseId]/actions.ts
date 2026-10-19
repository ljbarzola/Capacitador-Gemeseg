"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { certState, issueModuleCertificate, startRecertification } from "@/lib/certificates";
import { itemHref } from "@/lib/course-links";
import { getCourseAccess } from "@/lib/dal";
import { getPrisma } from "@/lib/prisma";
import { getOutline, syncEnrollment } from "@/lib/progress";
import { gradeQuiz, type Answers } from "@/lib/quiz";

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

// Marca la lección como completada y lleva al siguiente ítem accesible del curso.
export async function completeLesson(formData: FormData) {
  const courseId = field(formData, "courseId");
  const lessonId = field(formData, "lessonId");
  const { user, preview } = await getCourseAccess(courseId);
  const userId = preview ? null : user.id;

  const outline = await getOutline(courseId, userId);
  const key = `lesson:${lessonId}`;
  const item = outline?.items.find((i) => i.key === key);
  if (!outline || !item || !item.accessible) redirect(`/cursos/${courseId}`);
  // La asistencia a una sesión en vivo la registra el instructor; la persona no la marca.
  if (item.lessonType === "SESSION") redirect(`/cursos/${courseId}/leccion/${lessonId}`);

  if (userId) {
    await getPrisma().lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: { userId, lessonId },
      // Al repetir una lección en un nuevo ciclo (recertificación) se actualiza la fecha.
      update: { completedAt: new Date() },
    });
    await syncEnrollment(userId, courseId);
    // El índice del curso (layout) se vuelve a calcular: marcas, avance y módulo abierto al día.
    revalidatePath(`/cursos/${courseId}`, "layout");
  }

  const fresh = (await getOutline(courseId, userId)) ?? outline;
  const index = fresh.items.findIndex((i) => i.key === key);
  const next = fresh.items.slice(index + 1).find((i) => i.accessible);
  redirect(next ? itemHref(courseId, next) : `/cursos/${courseId}`);
}

// «Finalizar módulo»: solo el módulo actual y solo cuando ya terminó todo lo que depende de la
// persona. Guarda la marca, emite el certificado del módulo (si tiene la casilla) y, si era el
// último, el curso queda completo y se emite el certificado final (lo hace syncEnrollment).
export async function finishModule(formData: FormData) {
  const courseId = field(formData, "courseId");
  const moduleId = field(formData, "moduleId");
  const { user, preview, enrollment } = await getCourseAccess(courseId);
  if (preview || !enrollment) redirect(`/cursos/${courseId}`);

  const outline = await getOutline(courseId, user.id);
  const target = outline?.modules.find((m) => m.id === moduleId);
  if (!outline || !target || target.id !== outline.currentModuleId || !target.ready) redirect(`/cursos/${courseId}`);

  if (!target.finalized) {
    await getPrisma().moduleCompletion.upsert({
      where: { userId_moduleId: { userId: user.id, moduleId } },
      create: { userId: user.id, moduleId },
      update: { completedAt: new Date() }, // la marca de un ciclo anterior ya no cuenta
    });
    await issueModuleCertificate(enrollment.id, moduleId);
  }
  await syncEnrollment(user.id, courseId);
  // El índice del curso cambia de módulo: se vuelve a calcular el layout.
  revalidatePath(`/cursos/${courseId}`, "layout");
  redirect(`/cursos/${courseId}?finalizado=${encodeURIComponent(moduleId)}`);
}

// Ficha de pregunta y respuesta: se califica en el servidor y devuelve siempre la retroalimentación.
// Es formativa: no guarda nada. Las respuestas correctas solo salen después de responder.
export type CardResult =
  | { ok: true; correct: boolean; feedback: string; correctOptionIds: string[] }
  | { ok: false; message: string };

export async function answerCard(input: {
  courseId: string;
  lessonId: string;
  cardId: string;
  optionIds: string[];
}): Promise<CardResult> {
  const { user, preview } = await getCourseAccess(String(input.courseId));
  const outline = await getOutline(String(input.courseId), preview ? null : user.id);
  const item = outline?.items.find((i) => i.key === `lesson:${input.lessonId}`);
  if (!item || !item.accessible) return { ok: false, message: "No puede abrir esta actividad todavía." };

  const card = await getPrisma().lessonCard.findFirst({
    where: { id: String(input.cardId), lessonId: input.lessonId },
    select: { feedback: true, options: { select: { id: true, isCorrect: true } } },
  });
  if (!card) return { ok: false, message: "No se encontró la ficha." };

  const chosen = new Set((Array.isArray(input.optionIds) ? input.optionIds : []).map(String));
  if (chosen.size === 0) return { ok: false, message: "Elija al menos una respuesta." };
  const correctOptionIds = card.options.filter((o) => o.isCorrect).map((o) => o.id);
  const correct =
    correctOptionIds.length === chosen.size &&
    correctOptionIds.every((id) => chosen.has(id)) &&
    [...chosen].every((id) => card.options.some((o) => o.id === id));
  return { ok: true, correct, feedback: card.feedback, correctOptionIds };
}

// Califica el examen en el servidor: las respuestas correctas nunca llegan al navegador.
export async function submitQuiz(formData: FormData) {
  const courseId = field(formData, "courseId");
  const submoduleId = field(formData, "submoduleId");
  const back = `/cursos/${courseId}/examen/${submoduleId}`;
  const { user, preview } = await getCourseAccess(courseId);
  const userId = preview ? null : user.id;

  const outline = await getOutline(courseId, userId);
  const item = outline?.items.find((i) => i.key === `quiz:${submoduleId}`);
  if (!outline || !item || !item.accessible) redirect(`/cursos/${courseId}`);

  const prisma = getPrisma();
  const quiz = await prisma.quiz.findUnique({
    where: { submoduleId },
    select: {
      id: true,
      passingScore: true,
      maxAttempts: true,
      questions: {
        select: { id: true, options: { select: { id: true, isCorrect: true } } },
      },
    },
  });
  if (!quiz || quiz.questions.length === 0) redirect(`/cursos/${courseId}`);

  if (userId && quiz.maxAttempts !== null) {
    const used = await prisma.quizAttempt.count({ where: { userId, quizId: quiz.id } });
    if (used >= quiz.maxAttempts) redirect(back);
  }

  const answers: Answers = {};
  for (const question of quiz.questions) {
    answers[question.id] = formData.getAll(`q_${question.id}`).filter((v): v is string => typeof v === "string");
  }
  if (quiz.questions.some((q) => answers[q.id].length === 0)) redirect(`${back}?error=faltan`);

  const { score } = gradeQuiz(quiz.questions, answers);
  const passed = score >= quiz.passingScore;

  if (!userId) redirect(`${back}?vista=${score}`);

  const attempt = await prisma.quizAttempt.create({
    data: { quizId: quiz.id, userId, answers, score, passed },
    select: { id: true },
  });
  if (passed) {
    await syncEnrollment(userId, courseId);
    // Aprobar puede finalizar el módulo (y abrir el siguiente): el índice debe reflejarlo ya.
    revalidatePath(`/cursos/${courseId}`, "layout");
  }
  redirect(`${back}?intento=${attempt.id}`);
}

// Comentarios finales del curso (texto libre, uno por persona; se pueden editar).
export type FeedbackState = { status: "idle" | "ok" | "error"; message: string };

export async function submitFeedback(_previous: FeedbackState, formData: FormData): Promise<FeedbackState> {
  const courseId = field(formData, "courseId");
  const comment = field(formData, "comment").trim().slice(0, 3000);
  const { user, enrollment } = await getCourseAccess(courseId);
  if (!enrollment || enrollment.status !== "COMPLETED") {
    return { status: "error", message: "Solo puede comentar un curso que ya completó." };
  }
  if (!comment) return { status: "error", message: "Escriba su comentario antes de enviarlo." };
  await getPrisma().courseFeedback.upsert({
    where: { userId_courseId: { userId: user.id, courseId } },
    create: { userId: user.id, courseId, comment },
    update: { comment },
  });
  revalidatePath(`/cursos/${courseId}`);
  return { status: "ok", message: "Comentarios enviados. ¡Gracias por ayudarnos a mejorar!" };
}

// Inicia un nuevo ciclo de certificación cuando el certificado está por vencer o ya venció.
export async function restartCertification(formData: FormData) {
  const courseId = field(formData, "courseId");
  const { user, enrollment } = await getCourseAccess(courseId);
  if (!enrollment) redirect(`/cursos/${courseId}`);

  const latest = await getPrisma().certificate.findFirst({
    where: { enrollmentId: enrollment.id, kind: "COURSE" },
    orderBy: { issuedAt: "desc" },
    select: { expiresAt: true },
  });
  const state = latest ? certState(latest.expiresAt) : null;
  if (state === "expired" || state === "expiring") {
    await startRecertification(enrollment.id);
    const course = await getPrisma().course.findUnique({ where: { id: courseId }, select: { title: true } });
    await audit(user, "certificado.renovar", `${user.firstNames} ${user.lastNames} inició la recertificación de «${course?.title}»`, {
      entity: "curso",
      entityId: courseId,
    });
  }
  redirect(`/cursos/${courseId}`);
}
