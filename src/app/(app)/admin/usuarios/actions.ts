"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
  const target = await prisma.user.findUnique({ where: { id }, select: { role: true, active: true } });
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

  await prisma.user.update({
    where: { id },
    data: { role, active, groupId: groupId && (await prisma.group.findUnique({ where: { id: groupId } })) ? groupId : null },
  });
  revalidatePath("/admin/usuarios");
  redirect(withFlash(safeBack, "ok", "guardado"));
}
