import { cookies } from "next/headers";
import { getAdminAuth } from "@/lib/firebase/admin";
import { SESSION_COOKIE, clearSessionCookie } from "@/lib/session";

export async function POST() {
  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  if (cookie) {
    // Invalida las sesiones del usuario en todos los dispositivos (mejor esfuerzo).
    try {
      const auth = getAdminAuth();
      const decoded = await auth.verifySessionCookie(cookie);
      await auth.revokeRefreshTokens(decoded.uid);
    } catch {}
  }
  await clearSessionCookie();
  return Response.json({ ok: true });
}
