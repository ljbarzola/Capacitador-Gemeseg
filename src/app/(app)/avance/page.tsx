import type { Metadata } from "next";
import Link from "next/link";
import { Button, Card, Empty, LinkButton, PageHeader, ProgressBar, Select, Stat, TableWrap, Td, Th } from "@/components/ui";
import { CertBadge } from "@/components/status";
import { requireStaff } from "@/lib/dal";
import { formatDate } from "@/lib/format";
import { first } from "@/lib/form";
import { getPrisma } from "@/lib/prisma";
import { getAllReports } from "@/lib/stats";

export const metadata: Metadata = { title: "Avance · Capacitación Gemeseg" };

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireStaff();
  const groupId = first((await searchParams).grupo) || null;
  const [reports, groups] = await Promise.all([
    getAllReports({ groupId }),
    getPrisma().group.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const rows = reports.flatMap((r) => r.people.map((p) => ({ ...p, course: r.course })));
  const sum = (f: (r: (typeof reports)[number]) => number) => reports.reduce((n, r) => n + f(r), 0);
  const enrolled = sum((r) => r.summary.enrolled);
  const completed = sum((r) => r.summary.completed);
  const people = new Set(rows.map((r) => r.userId)).size;
  const avgPercent = enrolled ? Math.round(rows.reduce((n, r) => n + r.percent, 0) / enrolled) : 0;

  // Quienes necesitan seguimiento: atrasados, certificado vencido o por vencer.
  const attention = rows
    .filter((r) => r.overdue || r.cert?.state === "expired" || r.cert?.state === "expiring")
    .sort((a, b) => (a.cert?.expiresAt?.getTime() ?? a.dueAt?.getTime() ?? 0) - (b.cert?.expiresAt?.getTime() ?? b.dueAt?.getTime() ?? 0))
    .slice(0, 15);

  const exportUrl = `/api/reportes/avance${groupId ? `?grupo=${groupId}` : ""}`;

  return (
    <>
      <PageHeader
        title="Avance"
        subtitle="Seguimiento de las capacitaciones por curso y por persona."
        actions={
          <>
            <form action="/avance" className="flex items-center gap-2">
              <Select name="grupo" defaultValue={groupId ?? ""} aria-label="Filtrar por grupo" className="w-48">
                <option value="">Todos los grupos</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </Select>
              <Button type="submit" variant="secondary">
                Filtrar
              </Button>
            </form>
            <LinkButton href={exportUrl} variant="dark">
              Descargar Excel
            </LinkButton>
          </>
        }
      />

      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Personas con cursos" value={people} note={`${enrolled} inscripciones en total`} />
        <Stat
          label="Cursos completados"
          value={`${enrolled ? Math.round((completed / enrolled) * 100) : 0}%`}
          note={`${completed} de ${enrolled} inscripciones`}
        />
        <Stat label="Avance promedio" value={`${avgPercent}%`} note="de las actividades asignadas" />
        <Stat
          label="Certificados vigentes"
          value={sum((r) => r.summary.certValid + r.summary.certExpiring)}
          note={`${sum((r) => r.summary.certExpiring)} por vencer · ${sum((r) => r.summary.certExpired)} vencidos`}
        />
      </div>

      <h2 className="mb-3 text-xl text-navy">Por curso</h2>
      {reports.length === 0 ? (
        <Empty>Aún no hay cursos.</Empty>
      ) : (
        <TableWrap minWidth={820}>
          <thead>
            <tr>
              <Th>Curso</Th>
              <Th>Inscritos</Th>
              <Th>Completaron</Th>
              <Th>En curso</Th>
              <Th>Sin iniciar</Th>
              <Th className="w-44">Avance promedio</Th>
              <Th>Aprobación de exámenes</Th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.course.id} className="hover:bg-zinc-50">
                <Td>
                  <Link href={`/avance/cursos/${r.course.id}`} className="font-semibold text-navy underline-offset-2 hover:underline">
                    {r.course.title}
                  </Link>
                </Td>
                <Td>{r.summary.enrolled}</Td>
                <Td>{r.summary.completed}</Td>
                <Td>{r.summary.inProgress}</Td>
                <Td>{r.summary.notStarted}</Td>
                <Td>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <ProgressBar percent={r.summary.avgPercent} />
                    </div>
                    <span className="w-9 text-right text-xs text-zinc-600">{r.summary.avgPercent}%</span>
                  </div>
                </Td>
                <Td>{r.summary.passRate === null ? <span className="text-zinc-400">Sin intentos</span> : `${r.summary.passRate}%`}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      <h2 className="mb-3 mt-10 text-xl text-navy">Requieren seguimiento</h2>
      {attention.length === 0 ? (
        <Card className="text-sm text-zinc-600">Nadie está atrasado ni tiene certificados por vencer.</Card>
      ) : (
        <TableWrap minWidth={720}>
          <thead>
            <tr>
              <Th>Persona</Th>
              <Th>Curso</Th>
              <Th>Situación</Th>
              <Th>Fecha</Th>
            </tr>
          </thead>
          <tbody>
            {attention.map((r) => (
              <tr key={r.enrollmentId} className="hover:bg-zinc-50">
                <Td>
                  <Link href={`/avance/personas/${r.userId}`} className="font-semibold underline-offset-2 hover:underline">
                    {r.name}
                  </Link>
                  {r.group && <span className="block text-xs text-zinc-500">{r.group}</span>}
                </Td>
                <Td>{r.course.title}</Td>
                <Td>
                  {r.cert && (r.cert.state === "expired" || r.cert.state === "expiring") ? (
                    <CertBadge state={r.cert.state} />
                  ) : (
                    <span className="font-medium text-red-700">Fecha límite vencida</span>
                  )}
                </Td>
                <Td className="text-zinc-600">
                  {r.cert && (r.cert.state === "expired" || r.cert.state === "expiring") && r.cert.expiresAt
                    ? `Vence el ${formatDate(r.cert.expiresAt)}`
                    : r.dueAt
                      ? `Límite el ${formatDate(r.dueAt)}`
                      : ""}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </>
  );
}
