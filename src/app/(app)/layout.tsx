import Image from "next/image";
import Link from "next/link";
import { NavLink } from "@/components/nav-link";
import { isStaff, requireUser } from "@/lib/dal";
import { getActiveFields } from "@/lib/registration-fields";
import { LogoutButton } from "./panel/logout-button";

// Marco de la zona autenticada: cabecera azul marino con navegación según el rol.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const answers = (user.extraFields ?? {}) as Record<string, unknown>;
  const missingProfile = (await getActiveFields()).filter((f) => f.required && !String(answers[f.key] ?? "").trim()).length;

  return (
    <div className="flex flex-1 flex-col">
      <header className="bg-navy">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-1 px-4 pt-3">
          <Link href="/panel" aria-label="Inicio" className="shrink-0 pb-2">
            <Image
              src="/brand/logo-gemeseg-bgblue.png"
              alt="Gemeseg Seguridad"
              width={2765}
              height={562}
              className="h-auto w-28 sm:w-32"
              priority
            />
          </Link>
          <nav className="order-last flex w-full items-end gap-5 overflow-x-auto sm:order-none sm:w-auto sm:flex-1" aria-label="Principal">
            <NavLink href="/panel" variant="header">
              Mis cursos
            </NavLink>
            <NavLink href="/certificados" variant="header">
              Certificados
            </NavLink>
            {isStaff(user.role) && (
              <>
                <NavLink href="/admin" variant="header">
                  Administración
                </NavLink>
                <NavLink href="/avance" variant="header">
                  Avance
                </NavLink>
              </>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-3 pb-2">
            <Link href="/perfil" className="hidden max-w-52 truncate text-sm text-white/75 underline-offset-4 hover:text-white hover:underline md:inline">
              {user.firstNames} {user.lastNames}
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>
      {(user.mustChangePassword || missingProfile > 0) && (
        <div className="border-b border-amber-300 bg-amber-50">
          <p className="mx-auto w-full max-w-6xl px-4 py-2.5 text-sm text-amber-950">
            {user.mustChangePassword
              ? "Por seguridad, cambie la contraseña inicial que le entregaron. "
              : "Faltan datos obligatorios en su perfil. "}
            <Link href="/perfil" className="font-semibold underline underline-offset-2">
              {user.mustChangePassword ? "Cambiar contraseña" : "Completar mi perfil"}
            </Link>
          </p>
        </div>
      )}
      <main id="contenido" className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-7 sm:py-9">
        {children}
      </main>
    </div>
  );
}
