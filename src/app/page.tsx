import Image from "next/image";

export default function Home() {
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
        <p className="text-zinc-600">Próximamente: inicio de sesión y cursos.</p>
      </div>
      <div className="h-1 w-16 rounded-full bg-brand" aria-hidden />
    </main>
  );
}
