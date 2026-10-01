import Image from "next/image";
import Link from "next/link";
import { NavLink } from "@/components/nav-link";
import { isStaff, requireUser } from "@/lib/dal";
import { LogoutButton } from "./panel/logout-button";

// Marco de la zona autenticada: cabecera con navegación según el rol.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex flex-1 flex-col bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <Link href="/panel" aria-label="Inicio">
            <Image
              src="/brand/logo-gemeseg-bgwhite.png"
              alt="Gemeseg Seguridad"
              width={2765}
              height={561}
              className="h-auto w-32 sm:w-40"
            />
          </Link>
          <nav className="flex flex-1 items-center gap-1 overflow-x-auto" aria-label="Principal">
            <NavLink href="/panel">Mis cursos</NavLink>
            {isStaff(user.role) && <NavLink href="/admin">Administración</NavLink>}
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-48 truncate text-sm text-zinc-600 md:inline">
              {user.firstNames} {user.lastNames}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:py-8">{children}</div>
    </div>
  );
}
