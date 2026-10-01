"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { requireStaff } from "@/lib/dal";
import { str } from "@/lib/form";
import { withFlash } from "@/lib/flash";
import { getPrisma } from "@/lib/prisma";

const PATH = "/admin/grupos";

function isUniqueViolation(error: unknown) {
  return (error as { code?: string }).code === "P2002";
}

export async function createGroup(formData: FormData) {
  const actor = await requireStaff();
  const name = str(formData, "name").slice(0, 80);
  if (!name) redirect(PATH);
  try {
    await getPrisma().group.create({ data: { name } });
  } catch (error) {
    if (isUniqueViolation(error)) redirect(withFlash(PATH, "error", "grupo_duplicado"));
    throw error;
  }
  await audit(actor, "grupo.crear", `Grupo «${name}»`, { entity: "grupo" });
  revalidatePath(PATH);
  redirect(withFlash(PATH, "ok", "creado"));
}

export async function renameGroup(formData: FormData) {
  const actor = await requireStaff();
  const id = str(formData, "id");
  const name = str(formData, "name").slice(0, 80);
  if (!id || !name) redirect(PATH);
  try {
    await getPrisma().group.update({ where: { id }, data: { name } });
  } catch (error) {
    if (isUniqueViolation(error)) redirect(withFlash(PATH, "error", "grupo_duplicado"));
    throw error;
  }
  await audit(actor, "grupo.renombrar", `Grupo renombrado a «${name}»`, { entity: "grupo", entityId: id });
  revalidatePath(PATH);
  redirect(withFlash(PATH, "ok", "guardado"));
}

export async function deleteGroup(formData: FormData) {
  const actor = await requireStaff();
  const id = str(formData, "id");
  if (id) {
    const group = await getPrisma().group.delete({ where: { id }, select: { name: true } }); // los usuarios quedan sin grupo
    await audit(actor, "grupo.eliminar", `Grupo «${group.name}»`, { entity: "grupo", entityId: id });
  }
  revalidatePath(PATH);
  redirect(withFlash(PATH, "ok", "eliminado"));
}
