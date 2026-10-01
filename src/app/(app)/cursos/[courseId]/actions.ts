"use server";

import { redirect } from "next/navigation";
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

  if (userId) {
    await getPrisma().lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: { userId, lessonId },
      update: {},
    });
    await syncEnrollment(userId, courseId);
  }

  const fresh = (await getOutline(courseId, userId)) ?? outline;
  const index = fresh.items.findIndex((i) => i.key === key);
  const next = fresh.items.slice(index + 1).find((i) => i.accessible);
  redirect(next ? itemHref(courseId, next) : `/cursos/${courseId}`);
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
  if (passed) await syncEnrollment(userId, courseId);
  redirect(`${back}?intento=${attempt.id}`);
}
