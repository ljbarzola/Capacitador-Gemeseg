"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/dal";
import { bool, optStr, str } from "@/lib/form";
import { withFlash } from "@/lib/flash";
import { getPrisma } from "@/lib/prisma";

const ROLES = ["STUDENT", "INSTRUCTOR", "ADMIN"] as const;

// Solo administradores. Cambia rol, grupo y estado de una cuenta.
export async function updateUser(formData: FormData) {
  const admin = await requireRole("ADMIN");
  const back = str(formData, "back") || "/admin/usuarios";
  const safeBack = back.startsWith("/admin/usuarios") ? back : "/admin/usuarios";

  const id = str(formData, "id");
  const role = ROLES.find((r) => r === str(formData, "role"));
  const active = bool(formData, "active");
  const groupId = optStr(formData, "groupId");
  if (!id || !role) redirect(safeBack);

  const prisma = getPrisma();
  const target = await prisma.user.findUnique({
    where: { id },
    select: { role: true, active: true, groupId: true, firstNames: true, lastNames: true, group: { select: { name: true } } },
  });
  if (!target) redirect(safeBack);

  if (id === admin.id && (role !== target.role || active !== target.active)) {
    redirect(withFlash(safeBack, "error", "propia_cuenta"));
  }

  // Siempre debe quedar al menos un administrador activo.
  const losesAdmin = target.role === "ADMIN" && target.active && (role !== "ADMIN" || !active);
  if (losesAdmin) {
    const others = await prisma.user.count({ where: { role: "ADMIN", active: true, id: { not: id } } });
    if (others === 0) redirect(withFlash(safeBack, "error", "sin_ultimo_admin"));
  }

  const newGroup = groupId ? await prisma.group.findUnique({ where: { id: groupId }, select: { id: true, name: true } }) : null;
  await prisma.user.update({
    where: { id },
    data: { role, active, groupId: newGroup?.id ?? null },
  });

  const ROLE_LABEL = { STUDENT: "Estudiante", INSTRUCTOR: "Instructor", ADMIN: "Administrador" } as const;
  const changes: string[] = [];
  if (role !== target.role) changes.push(`rol: ${ROLE_LABEL[target.role]} → ${ROLE_LABEL[role]}`);
  if (active !== target.active) changes.push(active ? "cuenta activada" : "cuenta desactivada");
  if ((newGroup?.id ?? null) !== target.groupId) changes.push(`grupo: ${target.group?.name ?? "ninguno"} → ${newGroup?.name ?? "ninguno"}`);
  if (changes.length) {
    await audit(admin, "usuario.actualizar", `${target.firstNames} ${target.lastNames}: ${changes.join("; ")}`, {
      entity: "usuario",
      entityId: id,
    });
  }
  revalidatePath("/admin/usuarios");
  redirect(withFlash(safeBack, "ok", "guardado"));
}
