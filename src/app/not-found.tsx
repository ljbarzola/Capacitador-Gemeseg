import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand">Error 404</p>
      <h1 className="text-2xl font-semibold text-navy">No encontramos esa página</h1>
      <p className="max-w-md text-zinc-600">
        Es posible que el enlace esté mal escrito, que el curso ya no exista o que no tenga acceso a él.
      </p>
      <Link
        href="/panel"
        className="rounded-lg bg-brand px-5 py-2.5 font-semibold text-white hover:brightness-95"
      >
        Ir a mis cursos
      </Link>
    </main>
  );
}
