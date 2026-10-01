import { cookies } from "next/headers";
import Link from "next/link";
import { BrandPanel } from "@/components/auth-ui";

export default async function Home() {
  const hasSession = (await cookies()).has("session");
  const primary = "rounded-md bg-brand px-5 py-2.5 font-semibold text-white transition-colors hover:bg-[#d6341a]";
  const secondary = "rounded-md border border-zinc-300 bg-white px-5 py-2.5 font-semibold text-navy transition-colors hover:border-zinc-400 hover:bg-zinc-50";

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <BrandPanel />
      <main className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <h1 className="text-3xl text-navy">Plataforma de capacitación</h1>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-zinc-600">
            Complete los cursos que se le asignan, rinda sus evaluaciones y descargue sus certificados.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {hasSession ? (
              <Link href="/panel" className={primary}>
                Ir a mis cursos
              </Link>
            ) : (
              <>
                <Link href="/login" className={primary}>
                  Ingresar
                </Link>
                <Link href="/registro" className={secondary}>
                  Crear cuenta
                </Link>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
