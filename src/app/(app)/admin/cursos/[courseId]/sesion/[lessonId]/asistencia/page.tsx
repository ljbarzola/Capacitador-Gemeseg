import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, Empty, LinkButton, PageHeader } from "@/components/ui";
import { canMarkAttendance, getSession, loadRoster } from "@/lib/attendance";
import { requireStaff } from "@/lib/dal";
import { formatLongDate, formatTime } from "@/lib/format";
import { meetingProvider, PHASE_LABEL, sessionPhase } from "@/lib/sessions";
import { AttendanceBoard } from "./attendance-board";

export const metadata: Metadata = { title: "Asistencia · Capacitación Gemeseg" };

export default async function AttendancePage({ params }: { params: Promise<{ courseId: string; lessonId: string }> }) {
  const user = await requireStaff();
  const { courseId, lessonId } = await params;
  const session = await getSession(lessonId);
  if (!session || session.courseId !== courseId) notFound();

  const roster = await loadRoster(courseId, lessonId);
  const canEdit = canMarkAttendance(user, session);
  const groups = [...new Set(roster.map((r) => r.group).filter((g): g is string => !!g))].sort((a, b) => a.localeCompare(b, "es"));
  const phase = session.startsAt ? sessionPhase(session.startsAt) : null;

  return (
    <>
      <PageHeader
        title={`Asistencia: ${session.title}`}
        subtitle={
          <>
            {session.courseTitle}
            {session.startsAt && ` · ${formatLongDate(session.startsAt)}, ${formatTime(session.startsAt)}`}
            {session.instructorName && ` · ${session.instructorName}`}
          </>
        }
        actions={
          <>
            {phase && <Badge tone={phase === "live" ? "green" : phase === "scheduled" ? "blue" : "gray"}>{PHASE_LABEL[phase]}</Badge>}
            {session.url && (
              <LinkButton href={session.url} variant="secondary" target="_blank" rel="noopener noreferrer" prefetch={false}>
                Abrir {meetingProvider(session.url)}
              </LinkButton>
            )}
          </>
        }
      />

      {!canEdit && (
        <Card className="mb-4 border-amber-300 bg-amber-50 text-sm text-amber-950">
          Solo el instructor responsable de esta sesión{session.instructorName ? ` (${session.instructorName})` : ""} o un administrador
          puede marcar la asistencia. Usted puede ver la lista.
        </Card>
      )}

      {roster.length === 0 ? (
        <Empty>
          Nadie está inscrito en este curso todavía.{" "}
          <Link href={`/admin/cursos/${courseId}/asignar`} className="font-semibold text-navy underline">
            Asignar el curso
          </Link>
        </Empty>
      ) : (
        <AttendanceBoard
          lessonId={lessonId}
          rows={roster.map((r) => ({ userId: r.userId, name: `${r.lastNames} ${r.firstNames}`, cedula: r.cedula, group: r.group }))}
          initialMarks={Object.fromEntries(roster.map((r) => [r.userId, r.status]))}
          groups={groups}
          canEdit={canEdit}
        />
      )}

      <p className="mt-6 text-sm">
        <Link href={`/admin/cursos/${courseId}`} className="text-zinc-600 underline">
          ← Volver al curso
        </Link>
      </p>
    </>
  );
}
