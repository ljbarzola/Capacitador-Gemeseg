import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@/generated/prisma/client";
import { getAdminAuth } from "@/lib/firebase/admin";
import { getPrisma } from "@/lib/prisma";
import { SESSION_COOKIE } from "@/lib/session";

// Capa de acceso a datos: toda comprobación de sesión y rol pasa por aquí.

export const getSessionUser = cache(async () => {
  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!cookie) return null;

  let uid: string;
  let emailVerified: boolean;
  try {
    const decoded = await getAdminAuth().verifySessionCookie(cookie);
    uid = decoded.uid;
    emailVerified = decoded.email_verified ?? false;
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
  return { ...user, emailVerified };
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
