import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Comprobación optimista: sin cookie de sesión no se llega al panel. La verificación
// real (firma, vigencia, usuario activo y rol) ocurre en src/lib/dal.ts.
export function proxy(request: NextRequest) {
  if (!request.cookies.has("session")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/panel/:path*", "/cursos/:path*", "/admin/:path*", "/avance/:path*", "/certificados/:path*"],
};
