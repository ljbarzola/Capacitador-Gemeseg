"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit, type Actor } from "@/lib/audit";
import { requireStaff } from "@/lib/dal";
import { withFlash } from "@/lib/flash";
import { str } from "@/lib/form";
import { getPrisma } from "@/lib/prisma";

const page = (courseId: string) => `/admin/cursos/${encodeURIComponent(courseId)}/asignar`;

// La fecha límite se interpreta al final del día en hora de Ecuador (UTC-5).
function parseDue(formData: FormData) {
  const raw = str(formData, "dueAt");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T23:59:59-05:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function enroll(courseId: string, actor: NonNullable<Actor>, userIds: string[], dueAt: Date | null, how: string) {
  if (userIds.length === 0) redirect(withFlash(page(courseId), "error", "sin_destinatarios"));
  const result = await getPrisma().enrollment.createMany({
    data: userIds.map((userId) => ({ userId, courseId, assignedById: actor.id, dueAt })),
    skipDuplicates: true, // quien ya estaba inscrito conserva su avance
  });
  const course = await getPrisma().course.findUnique({ where: { id: courseId }, select: { title: true } });
  await audit(actor, "inscripcion.asignar", `«${course?.title}» asignado a ${result.count} persona(s) (${how})${dueAt ? `, límite ${dueAt.toLocaleDateString("es-EC", { timeZone: "America/Guayaquil" })}` : ""}`, {
    entity: "curso",
    entityId: courseId,
    meta: { solicitadas: userIds.length, nuevas: result.count },
  });
  revalidatePath(page(courseId));
  redirect(withFlash(page(courseId), "ok", "asignado", result.count));
}

// Asignación masiva: todos los estudiantes activos, o todos los de un grupo.
export async function assignBulk(formData: FormData) {
  const staff = await requireStaff();
  const courseId = str(formData, "courseId");
  const target = str(formData, "target");
  const prisma = getPrisma();
  if (!(await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } }))) redirect("/admin/cursos");
  if (!target) redirect(withFlash(page(courseId), "error", "sin_seleccion"));

  const users = await prisma.user.findMany({
    where: { active: true, role: "STUDENT", ...(target === "ALL" ? {} : { groupId: target }) },
    select: { id: true },
  });
  await enroll(courseId, staff, users.map((u) => u.id), parseDue(formData), target === "ALL" ? "todos los estudiantes" : "grupo");
}

export async function assignPeople(formData: FormData) {
  const staff = await requireStaff();
  const courseId = str(formData, "courseId");
  const ids = formData.getAll("userId").filter((v): v is string => typeof v === "string");
  if (ids.length === 0) redirect(withFlash(page(courseId), "error", "sin_seleccion"));
  const users = await getPrisma().user.findMany({
    where: { id: { in: ids }, active: true },
    select: { id: true },
  });
  await enroll(courseId, staff, users.map((u) => u.id), parseDue(formData), "selección manual");
}

export async function removeEnrollment(formData: FormData) {
  const actor = await requireStaff();
  const courseId = str(formData, "courseId");
  const id = str(formData, "id");
  if (id) {
    const enrollment = await getPrisma().enrollment.findFirst({
      where: { id, courseId },
      select: { user: { select: { firstNames: true, lastNames: true } }, course: { select: { title: true } } },
    });
    await getPrisma().enrollment.deleteMany({ where: { id, courseId } });
    if (enrollment) {
      await audit(actor, "inscripcion.quitar", `${enrollment.user.firstNames} ${enrollment.user.lastNames} fue quitado de «${enrollment.course.title}»`, {
        entity: "curso",
        entityId: courseId,
      });
    }
  }
  revalidatePath(page(courseId));
  redirect(withFlash(page(courseId), "ok", "quitado"));
}
