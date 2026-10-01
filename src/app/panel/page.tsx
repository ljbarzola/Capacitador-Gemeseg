import type { Metadata } from "next";
import Image from "next/image";
import { requireUser } from "@/lib/dal";
import { LogoutButton } from "./logout-button";
import { VerifyEmailBanner } from "./verify-email-banner";

export const metadata: Metadata = { title: "Mi panel · Capacitación Gemeseg" };

const ROLE_LABEL = {
  STUDENT: "Estudiante",
  INSTRUCTOR: "Instructor",
  ADMIN: "Administrador",
} as const;

export default async function PanelPage() {
  const user = await requireUser();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Image
            src="/brand/logo-gemeseg-bgwhite.png"
            alt="Gemeseg Seguridad"
            width={2765}
            height={561}
            className="h-auto w-36 sm:w-44"
          />
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-zinc-600 sm:inline">{user.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
        {!user.emailVerified && <VerifyEmailBanner />}
        <div>
          <h1 className="text-2xl font-semibold text-navy">
            Hola, {user.firstNames.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            {ROLE_LABEL[user.role]} · Cédula {user.cedula}
          </p>
        </div>
        <section className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center text-zinc-600">
          Aún no tiene cursos asignados. Cuando se le asigne uno, aparecerá aquí.
        </section>
      </main>
    </div>
  );
}
