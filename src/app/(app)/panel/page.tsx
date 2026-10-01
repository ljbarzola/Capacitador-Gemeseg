import type { Metadata } from "next";
import Link from "next/link";
import { IconAward, IconBook, IconCheck, IconClock, IconFlag } from "@/components/icons";
import { CertBadge } from "@/components/status";
import { Card, IconChip, LinkButton, SegmentProgress, accentFor } from "@/components/ui";
import { certState } from "@/lib/certificates";
import { isStaff, requireUser } from "@/lib/dal";
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

  const todo = cards.filter((c) => c.enrollment.status === "ASSIGNED").length;
  const inProgress = cards.filter((c) => c.enrollment.status === "IN_PROGRESS").length;
  const done = cards.filter((c) => c.enrollment.status === "COMPLETED").length;
  const renewals = cards.filter((c) => c.needsRenewal).length;
  const pending = todo + inProgress;

  const summary =
    cards.length === 0
      ? isStaff(user.role)
        ? "Su cuenta de gestión no tiene cursos asignados."
        : "Cuando le asignen un curso aparecerá aquí."
      : `${pending === 0 ? "No tiene cursos pendientes" : pending === 1 ? "Tiene 1 curso pendiente" : `Tiene ${pending} cursos pendientes`}${
          renewals ? ` y ${renewals === 1 ? "1 certificado" : `${renewals} certificados`} por renovar` : ""
        }.`;

  const indicators = [
    { label: "Por iniciar", value: todo, icon: <IconFlag />, dot: "bg-white/70" },
    { label: "En curso", value: inProgress, icon: <IconClock />, dot: "bg-sky-300" },
    { label: "Completados", value: done, icon: <IconCheck />, dot: "bg-emerald-300" },
    { label: "Por renovar", value: renewals, icon: <IconAward />, dot: "bg-amber-300" },
  ];

  return (
    <>
      <section className="enter relative mb-7 overflow-hidden rounded-lg bg-gradient-to-br from-navy via-[#17154a] to-[#26226b] px-6 py-7 text-white sm:px-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-16 size-64 rounded-full bg-[#ee3b1b]/20 blur-3xl"
        />
        <div className="relative flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
          <div>
            <h1 className="text-[1.9rem] leading-tight sm:text-4xl">Hola, {user.firstNames.split(" ")[0]}</h1>
            <p className="mt-2 max-w-md text-[0.95rem] text-white/75">{summary}</p>
          </div>
          {cards.length > 0 && (
            <dl className="grid grid-cols-4 gap-2 sm:gap-3">
              {indicators.map((item) => (
                <div key={item.label} className="min-w-16 rounded-md bg-white/10 px-3 py-2.5 ring-1 ring-white/10">
                  <dt className="flex items-center gap-1.5 text-[0.7rem] text-white/70 sm:text-xs">
                    <span className={`size-1.5 rounded-full ${item.dot}`} aria-hidden />
                    {item.label}
                  </dt>
                  <dd className="mt-1 text-2xl font-semibold leading-none" style={{ fontStretch: "88%" }}>
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      {cards.length === 0 ? (
        <Card className="enter flex flex-col items-start gap-3 py-8 text-sm text-zinc-700" style={{ "--i": 1 } as React.CSSProperties}>
          {isStaff(user.role) ? (
            <>
              <p className="max-w-xl">
                Como parte del equipo de gestión usted no recibe cursos. Puede revisar cualquier curso con «Vista previa» y
                ver el avance de las personas en la sección Avance.
              </p>
              <div className="flex flex-wrap gap-2">
                <LinkButton href="/admin/cursos" variant="dark">
                  Ir a los cursos
                </LinkButton>
                <LinkButton href="/avance" variant="secondary">
                  Ver el avance
                </LinkButton>
              </div>
            </>
          ) : (
            <p>Aún no tiene cursos asignados. Su instructor o el área de talento humano se los asignará.</p>
          )}
        </Card>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {cards.map(({ enrollment, outline, cert, state, overdue, needsRenewal }, index) => {
            const accent = accentFor(enrollment.course.id);
            return (
              <li key={enrollment.id} className="enter" style={{ "--i": index + 1 } as React.CSSProperties}>
                <Card interactive accent={accent} className="flex h-full flex-col gap-4">
                  <div className="flex items-start gap-3.5">
                    <IconChip accent={accent}>
                      <IconBook />
                    </IconChip>
                    <div className="min-w-0">
                      <h2 className="text-xl leading-snug text-navy">
                        <Link href={`/cursos/${enrollment.course.id}`} className="underline-offset-2 hover:underline">
                          {enrollment.course.title}
                        </Link>
                      </h2>
                      {enrollment.course.description && (
                        <p className="mt-1.5 line-clamp-2 text-sm text-zinc-600">{enrollment.course.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-auto flex flex-col gap-3">
                    <div>
                      <SegmentProgress completed={outline?.completed ?? 0} total={outline?.total ?? 0} accent={accent} />
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
            );
          })}
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
