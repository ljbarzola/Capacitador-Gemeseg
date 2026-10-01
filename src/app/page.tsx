import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";

export default async function Home() {
  const hasSession = (await cookies()).has("session");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <Image
        src="/brand/logo-gemeseg-bgwhite.png"
        alt="Gemeseg Seguridad"
        width={2765}
        height={561}
        className="h-auto w-full max-w-md"
        priority
      />
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-navy sm:text-3xl">
          Plataforma de capacitación
        </h1>
        <p className="text-zinc-600">Cursos de capacitación para el personal de seguridad.</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {hasSession ? (
          <Link
            href="/panel"
            className="rounded-lg bg-brand px-5 py-2.5 font-semibold text-white hover:brightness-95"
          >
            Ir a mi panel
          </Link>
        ) : (
          <>
            <Link
              href="/login"
              className="rounded-lg bg-brand px-5 py-2.5 font-semibold text-white hover:brightness-95"
            >
              Ingresar
            </Link>
            <Link
              href="/registro"
              className="rounded-lg border border-navy px-5 py-2.5 font-semibold text-navy hover:bg-zinc-50"
            >
              Crear cuenta
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
