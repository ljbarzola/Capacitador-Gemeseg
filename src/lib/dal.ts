import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { Role } from "@/generated/prisma/client";
import { getAdminAuth } from "@/lib/firebase/admin";
import { getPrisma } from "@/lib/prisma";
import { SESSION_COOKIE } from "@/lib/session";

// Capa de acceso a datos: toda comprobación de sesión y rol pasa por aquí.

export const getSessionUser = cache(async () => {
  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!cookie) return null;

  let uid: string;
  try {
    const decoded = await getAdminAuth().verifySessionCookie(cookie);
    uid = decoded.uid;
  } catch {
    return null;
  }

  const user = await getPrisma().user.findUnique({
    where: { firebaseUid: uid },
    select: {
      id: true,
      email: true,
      firstNames: true,
      lastNames: true,
      cedula: true,
      role: true,
      active: true,
    },
  });
  if (!user || !user.active) return null;
  return user;
});

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(...roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/panel");
  return user;
}

// Instructores y administradores crean contenido, asignan cursos y ven la vista previa.
export function isStaff(role: Role) {
  return role === "INSTRUCTOR" || role === "ADMIN";
}

export async function requireStaff() {
  return requireRole("INSTRUCTOR", "ADMIN");
}

// Acceso de un usuario a un curso: el estudiante necesita inscripción y curso publicado; el
// personal puede abrir cualquier curso en vista previa (sin guardar avance si no está inscrito).
export async function getCourseAccess(courseId: string) {
  const user = await requireUser();
  const prisma = getPrisma();
  const [course, enrollment] = await Promise.all([
    prisma.course.findUnique({ where: { id: courseId }, select: { id: true, title: true, published: true } }),
    prisma.enrollment.findUnique({ where: { userId_courseId: { userId: user.id, courseId } } }),
  ]);
  const staff = isStaff(user.role);
  if (!course || (!enrollment && !staff) || (!course.published && !staff)) notFound();
  return { user, course, enrollment, preview: !enrollment };
}
