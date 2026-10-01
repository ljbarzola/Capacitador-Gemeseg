import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, Empty, LinkButton, PageHeader } from "@/components/ui";
import { requireStaff } from "@/lib/dal";
import { formatLongDate, formatTime } from "@/lib/format";
import { getPrisma } from "@/lib/prisma";
import { meetingProvider, PHASE_LABEL, SESSION_WINDOW_MS, sessionPhase } from "@/lib/sessions";

export const metadata: Metadata = { title: "Sesiones en vivo · Capacitación Gemeseg" };

export default async function SessionsPage() {
  const user = await requireStaff();
  const prisma = getPrisma();
  const mine = user.role === "ADMIN" ? {} : { instructorId: user.id };
  const nowMs = new Date().getTime();
  const since = new Date(nowMs - SESSION_WINDOW_MS);
  const recent = new Date(nowMs - 45 * 86400000);

  const select = {
    id: true,
    title: true,
    startsAt: true,
    url: true,
    instructor: { select: { firstNames: true, lastNames: true } },
    submodule: { select: { module: { select: { courseId: true, course: { select: { title: true } } } } } },
    attendance: { select: { status: true } },
  } as const;

  const [upcoming, past] = await Promise.all([
    prisma.lesson.findMany({ where: { type: "SESSION", ...mine, startsAt: { gte: since } }, orderBy: { startsAt: "asc" }, take: 50, select }),
    prisma.lesson.findMany({ where: { type: "SESSION", ...mine, startsAt: { lt: since, gte: recent } }, orderBy: { startsAt: "desc" }, take: 30, select }),
  ]);

  // Inscritos activos por curso, para mostrar cuántos faltan por marcar.
  const courseIds = [...new Set([...upcoming, ...past].map((s) => s.submodule.module.courseId))];
  const enrolled = await prisma.enrollment.groupBy({
    by: ["courseId"],
    where: { courseId: { in: courseIds }, user: { active: true } },
    _count: { _all: true },
  });
  const enrolledBy = new Map(enrolled.map((e) => [e.courseId, e._count._all]));

  const renderList = (list: typeof upcoming) => (
    <ul className="flex flex-col gap-3">
      {list.map((session) => {
        const courseId = session.submodule.module.courseId;
        const total = enrolledBy.get(courseId) ?? 0;
        const marked = session.attendance.length;
        const phase = session.startsAt ? sessionPhase(session.startsAt) : null;
        return (
          <li key={session.id}>
            <Card className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-semibold text-navy">
                  {session.title}
                  {phase && <Badge tone={phase === "live" ? "green" : phase === "scheduled" ? "blue" : "gray"}>{PHASE_LABEL[phase]}</Badge>}
                </p>
                <p className="mt-1 text-sm text-zinc-600">
                  {session.startsAt ? `${formatLongDate(session.startsAt)}, ${formatTime(session.startsAt)}` : "Sin fecha"} ·{" "}
                  {session.submodule.module.course.title}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {meetingProvider(session.url) ?? "Sin enlace"}
                  {user.role === "ADMIN" && ` · ${session.instructor ? `${session.instructor.firstNames} ${session.instructor.lastNames}` : "Sin instructor"}`}
                  {" · "}
                  Asistencia marcada: {marked} de {total}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {session.url && (
                  <LinkButton href={session.url} variant="secondary" target="_blank" rel="noopener noreferrer" prefetch={false}>
                    Abrir reunión
                  </LinkButton>
                )}
                <LinkButton href={`/admin/cursos/${courseId}/sesion/${session.id}/asistencia`} variant="dark">
                  Tomar asistencia
                </LinkButton>
              </div>
            </Card>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      <PageHeader
        title="Sesiones en vivo"
        subtitle={
          user.role === "ADMIN"
            ? "Todas las sesiones programadas. Desde aquí se abre la lista de asistencia."
            : "Las sesiones que usted dicta. Desde aquí abre la reunión y toma la asistencia."
        }
      />
      <h2 className="mb-3 text-xl text-navy">Próximas y en curso</h2>
      {upcoming.length === 0 ? (
        <Empty>
          No hay sesiones próximas. Para crear una, entre a un curso, agregue una lección y elija el tipo «Sesión en vivo».{" "}
          <Link href="/admin/cursos" className="font-semibold text-navy underline">
            Ir a los cursos
          </Link>
        </Empty>
      ) : (
        renderList(upcoming)
      )}

      <h2 className="mb-3 mt-10 text-xl text-navy">Pasadas (últimos 45 días)</h2>
      {past.length === 0 ? <p className="text-sm text-zinc-600">No hay sesiones pasadas recientes.</p> : renderList(past)}
    </>
  );
}
