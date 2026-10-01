import type { Metadata } from "next";
import Link from "next/link";
import { CertBadge } from "@/components/status";
import { Card, Empty, LinkButton, PageHeader, SegmentProgress } from "@/components/ui";
import { certState } from "@/lib/certificates";
import { requireUser } from "@/lib/dal";
import { formatDate } from "@/lib/format";
import { getPrisma } from "@/lib/prisma";
import { getOutline } from "@/lib/progress";

export const metadata: Metadata = { title: "Mis cursos · Capacitación Gemeseg" };

export default async function PanelPage() {
  const user = await requireUser();

  const enrollments = await getPrisma().enrollment.findMany({
    where: { userId: user.id, course: { published: true } },
    orderBy: { assignedAt: "desc" },
    select: {
      id: true,
      status: true,
      dueAt: true,
      course: { select: { id: true, title: true, description: true } },
      certificates: { orderBy: { issuedAt: "desc" }, take: 1, select: { expiresAt: true } },
    },
  });
  const outlines = await Promise.all(enrollments.map((e) => getOutline(e.course.id, user.id)));
  const now = new Date();

  const cards = enrollments
    .map((enrollment, index) => {
      const outline = outlines[index];
      const cert = enrollment.certificates[0];
      const state = cert ? certState(cert.expiresAt, now) : null;
      const overdue = !!enrollment.dueAt && enrollment.status !== "COMPLETED" && enrollment.dueAt < now;
      const needsRenewal = state === "expired" || state === "expiring";
      return { enrollment, outline, cert, state, overdue, needsRenewal };
    })
    // Primero lo que requiere acción (atrasado, renovar, en curso) y al final lo ya completado.
    .sort((a, b) => rank(a) - rank(b));

  const pending = cards.filter((c) => c.enrollment.status !== "COMPLETED").length;
  const renewals = cards.filter((c) => c.needsRenewal).length;

  return (
    <>
      <PageHeader
        title={`Hola, ${user.firstNames.split(" ")[0]}`}
        subtitle={
          cards.length === 0
            ? "Cuando le asignen un curso aparecerá aquí."
            : `${pending === 0 ? "No tiene cursos pendientes" : pending === 1 ? "Tiene 1 curso pendiente" : `Tiene ${pending} cursos pendientes`}${
                renewals ? ` y ${renewals === 1 ? "1 certificado" : `${renewals} certificados`} por renovar` : ""
              }.`
        }
      />
      {cards.length === 0 ? (
        <Empty>Aún no tiene cursos asignados. Su instructor o el área de talento humano se los asignará.</Empty>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {cards.map(({ enrollment, outline, cert, state, overdue, needsRenewal }) => (
            <li key={enrollment.id}>
              <Card className="flex h-full flex-col gap-4">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-xl leading-snug text-navy">
                      <Link href={`/cursos/${enrollment.course.id}`} className="underline-offset-2 hover:underline">
                        {enrollment.course.title}
                      </Link>
                    </h2>
                  </div>
                  {enrollment.course.description && (
                    <p className="mt-1.5 line-clamp-2 text-sm text-zinc-600">{enrollment.course.description}</p>
                  )}
                </div>

                <div className="mt-auto flex flex-col gap-3">
                  <div>
                    <SegmentProgress completed={outline?.completed ?? 0} total={outline?.total ?? 0} />
                    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 text-xs text-zinc-600">
                      <span>
                        {outline?.completed ?? 0} de {outline?.total ?? 0} actividades
                      </span>
                      {enrollment.dueAt && enrollment.status !== "COMPLETED" && (
                        <span className={overdue ? "font-semibold text-red-700" : undefined}>
                          {overdue ? "Venció el " : "Fecha límite: "}
                          {formatDate(enrollment.dueAt)}
                        </span>
                      )}
                    </div>
                  </div>

                  {cert && state && (
                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                      <CertBadge state={state} />
                      <span>{cert.expiresAt ? `hasta el ${formatDate(cert.expiresAt)}` : "sin vencimiento"}</span>
                    </div>
                  )}

                  <LinkButton
                    href={`/cursos/${enrollment.course.id}`}
                    variant={enrollment.status === "COMPLETED" && !needsRenewal ? "secondary" : "primary"}
                  >
                    {needsRenewal
                      ? "Renovar certificación"
                      : enrollment.status === "COMPLETED"
                        ? "Ver curso y certificado"
                        : (outline?.completed ?? 0) > 0
                          ? "Continuar"
                          : "Comenzar"}
                  </LinkButton>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function rank(c: { enrollment: { status: string }; overdue: boolean; needsRenewal: boolean }) {
  if (c.overdue) return 0;
  if (c.needsRenewal) return 1;
  if (c.enrollment.status === "IN_PROGRESS") return 2;
  if (c.enrollment.status === "ASSIGNED") return 3;
  return 4;
}
