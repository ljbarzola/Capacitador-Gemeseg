// Estructura mientras carga una pantalla de la zona autenticada (se muestra al instante).
export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="animate-pulse">
      <span className="sr-only">Cargando…</span>
      <div className="mb-3 h-8 w-64 rounded bg-zinc-200" />
      <div className="mb-8 h-4 w-96 max-w-full rounded bg-zinc-200" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-44 rounded-lg border border-zinc-200 bg-white" />
        <div className="h-44 rounded-lg border border-zinc-200 bg-white" />
      </div>
    </div>
  );
}
