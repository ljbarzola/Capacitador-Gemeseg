"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/dal";
import { withFlash } from "@/lib/flash";
import { bool, str } from "@/lib/form";
import { getPrisma } from "@/lib/prisma";
import { parseOptions, slugKey } from "@/lib/registration-fields";

const PATH = "/admin/campos";

export async function createField(formData: FormData) {
  const actor = await requireRole("ADMIN");
  const label = str(formData, "label").slice(0, 60);
  const type = str(formData, "type") === "SELECT" ? "SELECT" : "TEXT";
  const options = type === "SELECT" ? parseOptions(str(formData, "options")) : [];
  if (!label || (type === "SELECT" && options.length < 2)) redirect(withFlash(PATH, "error", "campo_invalido"));

  const prisma = getPrisma();
  const base = slugKey(label);
  let key = base;
  for (let n = 2; await prisma.registrationField.findUnique({ where: { key }, select: { id: true } }); n++) {
    key = `${base}_${n}`;
  }
  const last = await prisma.registrationField.aggregate({ _max: { order: true } });
  const field = await prisma.registrationField.create({
    data: { key, label, type, options, required: bool(formData, "required"), order: (last._max.order ?? -1) + 1 },
    select: { id: true },
  });
  await audit(actor, "campo.crear", `Campo de registro «${label}» (${type === "SELECT" ? "lista" : "texto"}${bool(formData, "required") ? ", obligatorio" : ""})`, {
    entity: "campo",
    entityId: field.id,
  });
  revalidatePath(PATH);
  redirect(withFlash(PATH, "ok", "creado"));
}

export async function updateField(formData: FormData) {
  const actor = await requireRole("ADMIN");
  const id = str(formData, "id");
  const label = str(formData, "label").slice(0, 60);
  const prisma = getPrisma();
  const current = await prisma.registrationField.findUnique({ where: { id }, select: { type: true } });
  if (!current) redirect(PATH);
  const options = current.type === "SELECT" ? parseOptions(str(formData, "options")) : [];
  if (!label || (current.type === "SELECT" && options.length < 2)) redirect(withFlash(PATH, "error", "campo_invalido"));

  await prisma.registrationField.update({
    where: { id },
    data: { label, options, required: bool(formData, "required"), active: bool(formData, "active") },
  });
  await audit(actor, "campo.actualizar", `Campo de registro «${label}» modificado`, { entity: "campo", entityId: id });
  revalidatePath(PATH);
  redirect(withFlash(PATH, "ok", "guardado"));
}

export async function deleteField(formData: FormData) {
  const actor = await requireRole("ADMIN");
  const id = str(formData, "id");
  if (id) {
    const field = await getPrisma().registrationField.delete({ where: { id }, select: { label: true } });
    await audit(actor, "campo.eliminar", `Campo de registro «${field.label}» eliminado (las respuestas ya guardadas se conservan)`, {
      entity: "campo",
      entityId: id,
    });
  }
  revalidatePath(PATH);
  redirect(withFlash(PATH, "ok", "eliminado"));
}

export async function moveField(formData: FormData) {
  await requireRole("ADMIN");
  const id = str(formData, "id");
  const direction = str(formData, "direction") === "up" ? -1 : 1;
  const prisma = getPrisma();
  const rows = await prisma.registrationField.findMany({ orderBy: [{ order: "asc" }, { id: "asc" }], select: { id: true } });
  const ids = rows.map((r) => r.id);
  const index = ids.indexOf(id);
  const target = index + direction;
  if (index >= 0 && target >= 0 && target < ids.length) {
    [ids[index], ids[target]] = [ids[target], ids[index]];
    await prisma.$transaction(ids.map((fid, order) => prisma.registrationField.update({ where: { id: fid }, data: { order } })));
  }
  revalidatePath(PATH);
  redirect(PATH);
}
