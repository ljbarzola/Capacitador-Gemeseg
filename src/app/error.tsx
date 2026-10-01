"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="contenido" className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <p className="text-sm font-semibold text-[#c42d12]">Algo salió mal</p>
      <h1 className="text-2xl font-semibold text-navy">No pudimos completar la operación</h1>
      <p className="max-w-md text-zinc-600">
        Intente de nuevo. Si el problema continúa, avise a su instructor o al área de sistemas.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-[#d6341a] px-5 py-2.5 font-semibold text-white transition-colors hover:bg-[#bd2d16]"
        >
          Reintentar
        </button>
        <Link href="/panel" className="rounded-md border border-navy px-5 py-2.5 font-semibold text-navy hover:bg-zinc-50">
          Ir a mis cursos
        </Link>
      </div>
    </main>
  );
}
