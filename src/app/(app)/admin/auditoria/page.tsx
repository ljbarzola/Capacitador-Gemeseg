import type { Metadata } from "next";
import { Button, Card, Empty, Input, LinkButton, PageHeader, Select, TableWrap, Td, Th } from "@/components/ui";
import type { Prisma } from "@/generated/prisma/client";
import { AUDIT_ACTIONS } from "@/lib/audit";
import { requireRole } from "@/lib/dal";
import { formatDateTime } from "@/lib/format";
import { first } from "@/lib/form";
import { getPrisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Auditoría · Capacitación Gemeseg" };

const PAGE_SIZE = 50;

// Fecha local de Ecuador (UTC-5) → instante UTC al inicio o al final del día.
const dayStart = (d: string) => new Date(`${d}T00:00:00-05:00`);
const dayEnd = (d: string) => new Date(`${d}T23:59:59.999-05:00`);
const isDay = (d?: string) => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d);

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireRole("ADMIN");
  const query = await searchParams;
  const action = first(query.accion) ?? "";
  const q = first(query.q)?.trim() ?? "";
  const from = first(query.desde);
  const to = first(query.hasta);
  const page = Math.max(1, Number(first(query.pagina)) || 1);

  const where: Prisma.AuditLogWhereInput = {
    ...(action in AUDIT_ACTIONS && { action }),
    ...(q && {
      OR: [
        { summary: { contains: q, mode: "insensitive" } },
        { actorName: { contains: q, mode: "insensitive" } },
      ],
    }),
    ...((isDay(from) || isDay(to)) && {
      createdAt: {
        ...(isDay(from) && { gte: dayStart(from!) }),
        ...(isDay(to) && { lte: dayEnd(to!) }),
      },
    }),
  };

  const prisma = getPrisma();
  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, createdAt: true, actorName: true, action: true, summary: true },
    }),
    prisma.auditLog.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const params = new URLSearchParams();
  if (action) params.set("accion", action);
  if (q) params.set("q", q);
  if (isDay(from)) params.set("desde", from!);
  if (isDay(to)) params.set("hasta", to!);
  const withPage = (p: number) => {
    const next = new URLSearchParams(params);
    if (p > 1) next.set("pagina", String(p));
    return `/admin/auditoria${next.size ? `?${next}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Auditoría"
        subtitle="Quién hizo qué y cuándo: cambios de usuarios, cursos, asignaciones y certificados. Solo la ve el administrador."
      />
      <Card className="mb-6">
        <form action="/admin/auditoria" className="grid gap-3 md:grid-cols-[1.2fr_1fr_9rem_9rem_auto]">
          <Input name="q" defaultValue={q} placeholder="Buscar por persona o texto" aria-label="Buscar" />
          <Select name="accion" defaultValue={action} aria-label="Tipo de acción">
            <option value="">Todas las acciones</option>
            {Object.entries(AUDIT_ACTIONS).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </Select>
          <Input name="desde" type="date" defaultValue={isDay(from) ? from : ""} aria-label="Desde" />
          <Input name="hasta" type="date" defaultValue={isDay(to) ? to : ""} aria-label="Hasta" />
          <Button type="submit" variant="secondary">
            Filtrar
          </Button>
        </form>
      </Card>

      {rows.length === 0 ? (
        <Empty>No hay registros con esos filtros.</Empty>
      ) : (
        <>
          <p className="mb-2 text-sm text-zinc-600">{total} registro(s)</p>
          <TableWrap minWidth={820}>
            <thead>
              <tr>
                <Th className="w-44">Fecha</Th>
                <Th className="w-48">Persona</Th>
                <Th className="w-56">Acción</Th>
                <Th>Detalle</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <Td className="text-zinc-600">{formatDateTime(row.createdAt)}</Td>
                  <Td className="font-medium">{row.actorName}</Td>
                  <Td className="text-zinc-700">{AUDIT_ACTIONS[row.action as keyof typeof AUDIT_ACTIONS] ?? row.action}</Td>
                  <Td className="text-zinc-700">{row.summary}</Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </>
      )}

      {pages > 1 && (
        <nav aria-label="Paginación" className="mt-6 flex items-center justify-center gap-3 text-sm">
          {page > 1 && (
            <LinkButton href={withPage(page - 1)} variant="secondary">
              Anterior
            </LinkButton>
          )}
          <span className="text-zinc-600">
            Página {page} de {pages}
          </span>
          {page < pages && (
            <LinkButton href={withPage(page + 1)} variant="secondary">
              Siguiente
            </LinkButton>
          )}
        </nav>
      )}
    </>
  );
}
