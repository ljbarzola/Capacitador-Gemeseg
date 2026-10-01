import { getAdminAuth } from "@/lib/firebase/admin";
import { getPrisma } from "@/lib/prisma";
import { SESSION_MAX_AGE_MS, setSessionCookie } from "@/lib/session";

// Intercambia el ID token de Firebase (recién obtenido al iniciar sesión) por una
// cookie de sesión httpOnly. Solo entra quien exista y esté activo en la base.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { idToken?: unknown } | null;
  const idToken = typeof body?.idToken === "string" ? body.idToken : null;
  if (!idToken) {
    return Response.json({ message: "Solicitud no válida." }, { status: 400 });
  }

  const auth = getAdminAuth();
  let decoded;
  try {
    decoded = await auth.verifyIdToken(idToken);
  } catch {
    return Response.json({ message: "Sesión no válida." }, { status: 401 });
  }

  // Solo se acepta un inicio de sesión reciente (últimos 5 minutos).
  if (Date.now() / 1000 - decoded.auth_time > 5 * 60) {
    return Response.json({ message: "Vuelva a iniciar sesión." }, { status: 401 });
  }

  const user = await getPrisma().user.findUnique({
    where: { firebaseUid: decoded.uid },
    select: { active: true },
  });
  if (!user || !user.active) {
    return Response.json(
      { message: "Su cuenta no está habilitada en la plataforma." },
      { status: 403 },
    );
  }

  const sessionCookie = await auth.createSessionCookie(idToken, {
    expiresIn: SESSION_MAX_AGE_MS,
  });
  await setSessionCookie(sessionCookie);
  return Response.json({ ok: true });
}
