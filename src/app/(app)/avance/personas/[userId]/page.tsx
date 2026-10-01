import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CertBadge, EnrollmentBadge } from "@/components/status";
import { Card, Empty, PageHeader, ProgressBar, SegmentProgress } from "@/components/ui";
import { requireStaff } from "@/lib/dal";
import { formatDate, formatDateTime } from "@/lib/format";
import { getPrisma } from "@/lib/prisma";
import { getCourseReport } from "@/lib/stats";

export const metadata: Metadata = { title: "Avance de la persona · Capacitación Gemeseg" };

export default async function PersonProgressPage({ params }: { params: Promise<{ userId: string }> }) {
  await requireStaff();
  const { userId } = await params;
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      firstNames: true,
      lastNames: true,
      email: true,
      cedula: true,
      active: true,
      group: { select: { name: true } },
      enrollments: { orderBy: { assignedAt: "desc" }, select: { courseId: true } },
    },
  });
  if (!user) notFound();

  const reports = (await Promise.all(user.enrollments.map((e) => getCourseReport(e.courseId, { userId })))).filter(
    (r) => r !== null,
  );

  return (
    <>
      <PageHeader
        title={`${user.firstNames} ${user.lastNames}`}
        subtitle={
          <>
            <Link href="/avance" className="underline underline-offset-2">
              Avance
            </Link>{" "}
            / persona · {user.email} · Cédula {user.cedula}
            {user.group ? ` · ${user.group.name}` : ""}
            {!user.active && " · Cuenta desactivada"}
          </>
        }
      />
      {reports.length === 0 ? (
        <Empty>Esta persona no tiene cursos asignados.</Empty>
      ) : (
        <div className="flex flex-col gap-5">
          {reports.map((r) => {
            const p = r.people[0];
            if (!p) return null;
            return (
              <Card key={r.course.id} className="flex flex-col gap-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={`/avance/cursos/${r.course.id}`} className="text-lg font-semibold text-navy underline-offset-2 hover:underline">
                      {r.course.title}
                    </Link>
                    <p className="mt-1 text-sm text-zinc-600">
                      Asignado el {formatDate(p.assignedAt)}
                      {p.dueAt ? ` · límite ${formatDate(p.dueAt)}` : ""}
                      {p.lastActivity ? ` · último movimiento ${formatDateTime(p.lastActivity)}` : " · sin actividad"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <EnrollmentBadge status={p.status} overdue={p.overdue} />
                    {p.cert && <CertBadge state={p.cert.state} />}
                  </div>
                </div>
                <div>
                  <SegmentProgress completed={p.completed} total={p.total} />
                  <p className="mt-1.5 text-xs text-zinc-500">
                    {p.completed} de {p.total} actividades · {p.percent}%
                    {p.avgScore !== null ? ` · nota media de exámenes ${p.avgScore}%` : ""}
                  </p>
                </div>
                <ul className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
                  {p.modules.map((m) => (
                    <li key={m.id} className="grid grid-cols-[1fr_6rem_3.5rem] items-center gap-3 text-sm">
                      <span className="truncate text-zinc-700">{m.title}</span>
                      <ProgressBar percent={m.total ? Math.round((m.done / m.total) * 100) : 0} />
                      <span className="text-right text-xs text-zinc-500">
                        {m.done}/{m.total}
                      </span>
                    </li>
                  ))}
                </ul>
                {p.cert && (
                  <p className="text-sm text-zinc-600">
                    Certificado {p.cert.code} · emitido el {formatDate(p.cert.issuedAt)}
                    {p.cert.expiresAt ? ` · vence el ${formatDate(p.cert.expiresAt)}` : " · sin vencimiento"} ·{" "}
                    <a className="font-semibold text-navy underline underline-offset-2" href={`/api/certificados/${p.cert.id}`}>
                      Descargar PDF
                    </a>
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
