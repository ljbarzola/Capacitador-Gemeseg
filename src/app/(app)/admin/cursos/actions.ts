"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";
import type { LessonType, Progression, QuestionType } from "@/generated/prisma/client";
import { requireStaff } from "@/lib/dal";
import { isHttpUrl, toEmbedUrl } from "@/lib/embed";
import { withFlash } from "@/lib/flash";
import { bool, int, optStr, str } from "@/lib/form";
import { getPrisma } from "@/lib/prisma";
import { createUploadUrl, deleteObject, newStoragePath } from "@/lib/storage";

const BASE = "/admin/cursos";
const editor = (courseId: string) => `${BASE}/${encodeURIComponent(courseId)}`;

async function done(courseId: string, code: "guardado" | "creado" | "eliminado" = "guardado"): Promise<never> {
  revalidatePath(editor(courseId), "layout");
  redirect(withFlash(editor(courseId), "ok", code));
}

// ───────────── Cursos ─────────────

export async function createCourse(formData: FormData) {
  const user = await requireStaff();
  const title = str(formData, "title").slice(0, 150);
  if (!title) redirect(BASE);
  const course = await getPrisma().course.create({
    data: { title, createdById: user.id },
    select: { id: true },
  });
  redirect(withFlash(editor(course.id), "ok", "creado"));
}

export async function updateCourse(formData: FormData) {
  await requireStaff();
  const id = str(formData, "id");
  const title = str(formData, "title").slice(0, 150);
  const progression: Progression = str(formData, "progression") === "SEQUENTIAL" ? "SEQUENTIAL" : "FREE";
  const months = int(formData, "recertMonths");
  if (!id || !title) redirect(BASE);
  await getPrisma().course.update({
    where: { id },
    data: {
      title,
      description: optStr(formData, "description")?.slice(0, 4000) ?? null,
      progression,
      published: bool(formData, "published"),
      recertMonths: months !== null && months > 0 && months <= 120 ? months : null,
    },
  });
  await done(id);
}

export async function deleteCourse(formData: FormData) {
  await requireStaff();
  const id = str(formData, "id");
  if (id) {
    const lessons = await getPrisma().lesson.findMany({
      where: { submodule: { module: { courseId: id } }, storagePath: { not: null } },
      select: { storagePath: true },
    });
    await getPrisma().course.delete({ where: { id } });
    await Promise.all(lessons.map((l) => deleteObject(l.storagePath!)));
  }
  revalidatePath(BASE);
  redirect(withFlash(BASE, "ok", "eliminado"));
}

// ───────────── Módulos, submódulos y orden ─────────────

export async function addModule(formData: FormData) {
  await requireStaff();
  const courseId = str(formData, "courseId");
  const title = str(formData, "title").slice(0, 150);
  if (!courseId || !title) redirect(editor(courseId));
  const prisma = getPrisma();
  const last = await prisma.module.aggregate({ where: { courseId }, _max: { order: true } });
  await prisma.module.create({ data: { courseId, title, order: (last._max.order ?? -1) + 1 } });
  await done(courseId, "creado");
}

export async function updateModule(formData: FormData) {
  await requireStaff();
  const id = str(formData, "id");
  const title = str(formData, "title").slice(0, 150);
  if (id && title) await getPrisma().module.update({ where: { id }, data: { title } });
  await done(str(formData, "courseId"));
}

export async function deleteModule(formData: FormData) {
  await requireStaff();
  const id = str(formData, "id");
  if (id) await removeLessonFiles({ submodule: { moduleId: id } }).then(() => getPrisma().module.delete({ where: { id } }));
  await done(str(formData, "courseId"), "eliminado");
}

export async function addSubmodule(formData: FormData) {
  await requireStaff();
  const moduleId = str(formData, "moduleId");
  const title = str(formData, "title").slice(0, 150);
  if (!moduleId || !title) redirect(editor(str(formData, "courseId")));
  const prisma = getPrisma();
  const last = await prisma.submodule.aggregate({ where: { moduleId }, _max: { order: true } });
  await prisma.submodule.create({ data: { moduleId, title, order: (last._max.order ?? -1) + 1 } });
  await done(str(formData, "courseId"), "creado");
}

export async function updateSubmodule(formData: FormData) {
  await requireStaff();
  const id = str(formData, "id");
  const title = str(formData, "title").slice(0, 150);
  if (id && title) await getPrisma().submodule.update({ where: { id }, data: { title } });
  await done(str(formData, "courseId"));
}

export async function deleteSubmodule(formData: FormData) {
  await requireStaff();
  const id = str(formData, "id");
  if (id) await removeLessonFiles({ submoduleId: id }).then(() => getPrisma().submodule.delete({ where: { id } }));
  await done(str(formData, "courseId"), "eliminado");
}

async function removeLessonFiles(where: { submoduleId: string } | { submodule: { moduleId: string } }) {
  const lessons = await getPrisma().lesson.findMany({
    where: { ...where, storagePath: { not: null } },
    select: { storagePath: true },
  });
  await Promise.all(lessons.map((l) => deleteObject(l.storagePath!)));
}

// Devuelve los ids con `id` intercambiado con su vecino, o null si no se puede mover.
function swapped(ids: string[], id: string, direction: -1 | 1) {
  const index = ids.indexOf(id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= ids.length) return null;
  const result = [...ids];
  [result[index], result[target]] = [result[target], result[index]];
  return result;
}

// Intercambia la posición con el hermano anterior o siguiente y renumera 0..n.
export async function moveItem(formData: FormData) {
  await requireStaff();
  const kind = str(formData, "kind");
  const id = str(formData, "id");
  const direction = str(formData, "direction") === "up" ? -1 : 1;
  const prisma = getPrisma();
  const orderBy = [{ order: "asc" as const }, { id: "asc" as const }];

  if (kind === "module") {
    const item = await prisma.module.findUnique({ where: { id }, select: { courseId: true } });
    const rows = item ? await prisma.module.findMany({ where: { courseId: item.courseId }, orderBy, select: { id: true } }) : [];
    const ids = swapped(rows.map((r) => r.id), id, direction);
    if (ids) await prisma.$transaction(ids.map((sid, order) => prisma.module.update({ where: { id: sid }, data: { order } })));
  } else if (kind === "submodule") {
    const item = await prisma.submodule.findUnique({ where: { id }, select: { moduleId: true } });
    const rows = item ? await prisma.submodule.findMany({ where: { moduleId: item.moduleId }, orderBy, select: { id: true } }) : [];
    const ids = swapped(rows.map((r) => r.id), id, direction);
    if (ids) await prisma.$transaction(ids.map((sid, order) => prisma.submodule.update({ where: { id: sid }, data: { order } })));
  } else if (kind === "lesson") {
    const item = await prisma.lesson.findUnique({ where: { id }, select: { submoduleId: true } });
    const rows = item ? await prisma.lesson.findMany({ where: { submoduleId: item.submoduleId }, orderBy, select: { id: true } }) : [];
    const ids = swapped(rows.map((r) => r.id), id, direction);
    if (ids) await prisma.$transaction(ids.map((sid, order) => prisma.lesson.update({ where: { id: sid }, data: { order } })));
  }
  await done(str(formData, "courseId"));
}

// ───────────── Lecciones ─────────────

const LESSON_TYPES: LessonType[] = ["TEXT", "VIDEO_EMBED", "VIDEO_UPLOAD", "IMAGE", "LINK", "FILE"];

export async function saveLesson(formData: FormData) {
  await requireStaff();
  const courseId = str(formData, "courseId");
  const lessonId = str(formData, "lessonId");
  const submoduleId = str(formData, "submoduleId");
  const title = str(formData, "title").slice(0, 150);
  const type = LESSON_TYPES.find((t) => t === str(formData, "type"));
  const back = lessonId
    ? `${editor(courseId)}/leccion/${lessonId}`
    : `${editor(courseId)}/leccion/nueva?submodulo=${encodeURIComponent(submoduleId)}`;
  if (!title || !type) redirect(withFlash(back, "error", "leccion_invalida"));

  const body = str(formData, "body").slice(0, 50000);
  const url = str(formData, "url");
  let storagePath = str(formData, "storagePath");
  const fileName = str(formData, "fileName").slice(0, 200);
  if (storagePath && (!storagePath.startsWith("lessons/") || storagePath.includes(".."))) storagePath = "";

  const data: {
    title: string;
    type: LessonType;
    body: string | null;
    url: string | null;
    storagePath: string | null;
    fileName: string | null;
  } = { title, type, body: null, url: null, storagePath: null, fileName: null };

  switch (type) {
    case "TEXT":
      if (!body) redirect(withFlash(back, "error", "leccion_invalida"));
      data.body = body;
      break;
    case "VIDEO_EMBED":
      if (!toEmbedUrl(url)) redirect(withFlash(back, "error", "enlace_invalido"));
      data.url = url;
      break;
    case "LINK":
      if (!isHttpUrl(url)) redirect(withFlash(back, "error", "enlace_invalido"));
      data.url = url;
      break;
    case "IMAGE":
      if (storagePath) {
        data.storagePath = storagePath;
        data.fileName = fileName || null;
      } else if (isHttpUrl(url)) {
        data.url = url;
      } else {
        redirect(withFlash(back, "error", "leccion_invalida"));
      }
      break;
    case "VIDEO_UPLOAD":
    case "FILE":
      if (!storagePath) redirect(withFlash(back, "error", "leccion_invalida"));
      data.storagePath = storagePath;
      data.fileName = fileName || null;
      break;
  }

  const prisma = getPrisma();
  if (lessonId) {
    const previous = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { storagePath: true } });
    await prisma.lesson.update({ where: { id: lessonId }, data });
    if (previous?.storagePath && previous.storagePath !== data.storagePath) await deleteObject(previous.storagePath);
    await done(courseId);
  }

  if (!submoduleId) redirect(editor(courseId));
  const last = await prisma.lesson.aggregate({ where: { submoduleId }, _max: { order: true } });
  await prisma.lesson.create({ data: { ...data, submoduleId, order: (last._max.order ?? -1) + 1 } });
  await done(courseId, "creado");
}

export async function deleteLesson(formData: FormData) {
  await requireStaff();
  const id = str(formData, "id");
  if (id) {
    const lesson = await getPrisma().lesson.delete({ where: { id }, select: { storagePath: true } });
    if (lesson.storagePath) await deleteObject(lesson.storagePath);
  }
  await done(str(formData, "courseId"), "eliminado");
}

const UPLOAD_LIMITS: Record<string, { max: number; accept: (type: string) => boolean }> = {
  VIDEO_UPLOAD: { max: 2 * 1024 ** 3, accept: (t) => t.startsWith("video/") },
  IMAGE: { max: 10 * 1024 ** 2, accept: (t) => t.startsWith("image/") },
  FILE: { max: 100 * 1024 ** 2, accept: () => true },
};

// Devuelve una URL firmada para que el navegador suba el archivo directo a Cloud Storage.
export type UploadRequest =
  | { error: string }
  | { uploadUrl: string; path: string; contentType: string; maxBytes: number };

export async function requestUpload(input: {
  kind: string;
  fileName: string;
  contentType: string;
  size: number;
}): Promise<UploadRequest> {
  await requireStaff();
  const limit = UPLOAD_LIMITS[input.kind];
  const contentType = input.contentType || "application/octet-stream";
  if (!limit || !limit.accept(contentType)) return { error: "Tipo de archivo no permitido." };
  if (!Number.isFinite(input.size) || input.size <= 0 || input.size > limit.max) {
    return { error: `El archivo supera el máximo de ${Math.round(limit.max / 1024 ** 2)} MB.` };
  }
  const path = newStoragePath(input.fileName);
  try {
    const uploadUrl = await createUploadUrl(path, contentType, limit.max);
    return { uploadUrl, path, contentType, maxBytes: limit.max };
  } catch (error) {
    console.error("requestUpload", error);
    return { error: "No se pudo preparar la subida. Intente de nuevo." };
  }
}

// ───────────── Examen ─────────────

export async function saveQuizSettings(formData: FormData) {
  await requireStaff();
  const courseId = str(formData, "courseId");
  const submoduleId = str(formData, "submoduleId");
  const passing = int(formData, "passingScore");
  const attempts = int(formData, "maxAttempts");
  const data = {
    passingScore: passing !== null && passing >= 1 && passing <= 100 ? passing : 70,
    shuffleQuestions: bool(formData, "shuffleQuestions"),
    shuffleOptions: bool(formData, "shuffleOptions"),
    maxAttempts: attempts !== null && attempts >= 1 ? attempts : null,
  };
  await getPrisma().quiz.upsert({
    where: { submoduleId },
    create: { submoduleId, ...data },
    update: data,
  });
  revalidatePath(`${editor(courseId)}/examen/${submoduleId}`);
  redirect(withFlash(`${editor(courseId)}/examen/${submoduleId}`, "ok", "guardado"));
}

export async function deleteQuiz(formData: FormData) {
  await requireStaff();
  const submoduleId = str(formData, "submoduleId");
  await getPrisma().quiz.deleteMany({ where: { submoduleId } });
  await done(str(formData, "courseId"), "eliminado");
}

const questionSchema = z
  .object({
    type: z.enum(["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE"]),
    text: z.string().trim().min(1).max(1000),
    options: z
      .array(z.object({ text: z.string().trim().min(1).max(500), correct: z.boolean() }))
      .min(2)
      .max(8),
  })
  .refine((q) => {
    const correct = q.options.filter((o) => o.correct).length;
    if (q.type === "TRUE_FALSE") return q.options.length === 2 && correct === 1;
    if (q.type === "SINGLE_CHOICE") return correct === 1;
    return correct >= 1;
  });

export async function saveQuestion(formData: FormData) {
  await requireStaff();
  const courseId = str(formData, "courseId");
  const submoduleId = str(formData, "submoduleId");
  const questionId = str(formData, "questionId");
  const back = `${editor(courseId)}/examen/${submoduleId}`;

  let raw: unknown;
  try {
    raw = { type: str(formData, "type"), text: str(formData, "text"), options: JSON.parse(str(formData, "options") || "[]") };
  } catch {
    redirect(withFlash(back, "error", "pregunta_invalida"));
  }
  const parsed = questionSchema.safeParse(raw);
  if (!parsed.success) redirect(withFlash(back, "error", "pregunta_invalida"));
  const { type, text, options } = parsed.data;

  const prisma = getPrisma();
  const quiz = await prisma.quiz.findUnique({ where: { submoduleId }, select: { id: true } });
  if (!quiz) redirect(back);

  const optionRows = options.map((o) => ({ text: o.text, isCorrect: o.correct }));
  if (questionId) {
    await prisma.$transaction([
      prisma.question.update({ where: { id: questionId, quizId: quiz.id }, data: { type: type as QuestionType, text } }),
      prisma.option.deleteMany({ where: { questionId } }),
      prisma.option.createMany({ data: optionRows.map((o) => ({ ...o, questionId })) }),
    ]);
  } else {
    const last = await prisma.question.aggregate({ where: { quizId: quiz.id }, _max: { order: true } });
    await prisma.question.create({
      data: {
        quizId: quiz.id,
        type: type as QuestionType,
        text,
        order: (last._max.order ?? -1) + 1,
        options: { create: optionRows },
      },
    });
  }
  revalidatePath(back);
  redirect(withFlash(back, "ok", questionId ? "guardado" : "creado"));
}

export async function deleteQuestion(formData: FormData) {
  await requireStaff();
  const id = str(formData, "id");
  const back = `${editor(str(formData, "courseId"))}/examen/${str(formData, "submoduleId")}`;
  if (id) await getPrisma().question.deleteMany({ where: { id } });
  revalidatePath(back);
  redirect(withFlash(back, "ok", "eliminado"));
}
