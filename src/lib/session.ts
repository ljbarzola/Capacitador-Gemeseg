import "server-only";
import { cookies } from "next/headers";

// Cookie de sesión emitida por Firebase (createSessionCookie), httpOnly y firmada por Google.
export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

export async function setSessionCookie(value: string) {
  (await cookies()).set(SESSION_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_MS / 1000,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}
