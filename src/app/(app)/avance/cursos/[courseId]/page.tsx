import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IconAward, IconCheck, IconChart, IconUsers } from "@/components/icons";
import { CertBadge, EnrollmentBadge } from "@/components/status";
import {
  ACCENTS,
  Button,
  Card,
  Empty,
  LinkButton,
  PageHeader,
  ProgressBar,
  SegmentProgress,
  Select,
  Stat,
  TableWrap,
  Td,
  Th,
} from "@/components/ui";
import { requireStaff } from "@/lib/dal";
import { formatDate, formatDateTime } from "@/lib/format";
import { first } from "@/lib/form";
import { getPrisma } from "@/lib/prisma";
import { getCourseReport } from "@/lib/stats";

export const metadata: Metadata = { title: "Avance del curso · Capacitación Gemeseg" };

export default async function CourseProgressPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireStaff();
  const { courseId } = await params;
  const groupId = first((await searchParams).grupo) || null;
  const [report, groups] = await Promise.all([
    getCourseReport(courseId, { groupId }),
    getPrisma().group.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!report) notFound();
  const { summary: s } = report;

  return (
    <>
      <PageHeader
        title={report.course.title}
        subtitle={
          <>
            <Link href="/avance" className="underline underline-offset-2">
              Avance
            </Link>{" "}
            / detalle del curso
          </>
        }
        actions={
          <>
            <form action={`/avance/cursos/${courseId}`} className="flex items-center gap-2">
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
            <LinkButton
              href={`/api/reportes/avance?curso=${courseId}${groupId ? `&grupo=${groupId}` : ""}`}
              variant="dark"
            >
              Descargar Excel
            </LinkButton>
          </>
        }
      />

      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat accent={ACCENTS[2]} icon={<IconUsers />} label="Inscritos" value={s.enrolled} note={`${s.notStarted} sin iniciar · ${s.inProgress} en curso`} />
        <Stat accent={ACCENTS[4]} icon={<IconCheck />} label="Completaron" value={s.completed} note={`${s.enrolled ? Math.round((s.completed / s.enrolled) * 100) : 0}% de los inscritos`} />
        <Stat accent={ACCENTS[1]} icon={<IconChart />} label="Avance promedio" value={`${s.avgPercent}%`} note={s.overdue ? `${s.overdue} con fecha límite vencida` : "Sin atrasos"} />
        <Stat
          accent={ACCENTS[3]}
          icon={<IconAward />}
          label="Aprobación de exámenes"
          value={s.passRate === null ? "—" : `${s.passRate}%`}
          note={`Certificados: ${s.certValid + s.certExpiring} vigentes · ${s.certExpired} vencidos`}
        />
      </div>

      {report.sessions.length > 0 && (
        <>
          <h2 className="mb-3 text-xl text-navy">Sesiones en vivo</h2>
          <div className="mb-10">
            <TableWrap minWidth={760}>
              <thead>
                <tr>
                  <Th>Sesión</Th>
                  <Th>Fecha</Th>
                  <Th>Instructor</Th>
                  <Th>Asistieron</Th>
                  <Th>Justificadas</Th>
                  <Th>No asistieron</Th>
                  <Th>Sin marcar</Th>
                  <Th className="text-right">Asistencia</Th>
                </tr>
              </thead>
              <tbody>
                {report.sessions.map((session) => (
                  <tr key={session.id}>
                    <Td className="font-medium">{session.title}</Td>
                    <Td className="whitespace-nowrap text-zinc-600">
                      {session.startsAt ? formatDateTime(session.startsAt) : <span className="text-zinc-400">Sin fecha</span>}
                    </Td>
                    <Td className="text-zinc-600">{session.instructor ?? <span className="text-zinc-400">—</span>}</Td>
                    <Td className="font-semibold text-green-800">{session.attended}</Td>
                    <Td>{session.excused}</Td>
                    <Td className={session.absent ? "text-red-700" : undefined}>{session.absent}</Td>
                    <Td className={session.unmarked ? "font-semibold text-amber-800" : "text-zinc-500"}>{session.unmarked}</Td>
                    <Td className="text-right">
                      <LinkButton href={`/admin/cursos/${courseId}/sesion/${session.id}/asistencia`} variant="secondary">
                        Abrir lista
                      </LinkButton>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </div>
        </>
      )}

      <h2 className="mb-3 text-xl text-navy">Avance por módulo</h2>
      {report.moduleStats.length === 0 ? (
        <Empty>Este curso no tiene módulos.</Empty>
      ) : (
        <Card className="mb-10 flex flex-col divide-y divide-zinc-100 p-0">
          {report.moduleStats.map((m) => (
            <div key={m.id} className="grid items-center gap-2 px-5 py-3.5 sm:grid-cols-[1fr_16rem_9rem]">
              <p className="font-medium text-navy">{m.title}</p>
              <ProgressBar percent={m.avgPercent} />
              <p className="text-sm text-zinc-600 sm:text-right">
                {m.completedPeople} de {s.enrolled} lo terminaron
              </p>
            </div>
          ))}
        </Card>
      )}

      <h2 className="mb-3 text-xl text-navy">Personas</h2>
      {report.people.length === 0 ? (
        <Empty>Nadie está inscrito en este curso{groupId ? " dentro del grupo elegido" : ""}.</Empty>
      ) : (
        <TableWrap minWidth={980}>
          <thead>
            <tr>
              <Th>Persona</Th>
              <Th>Estado</Th>
              <Th className="w-56">Avance</Th>
              <Th>Nota media</Th>
              <Th>Último movimiento</Th>
              <Th>Fecha límite</Th>
              <Th>Certificado</Th>
            </tr>
          </thead>
          <tbody>
            {report.people.map((p) => (
              <tr key={p.enrollmentId} className="hover:bg-zinc-50">
                <Td>
                  <Link href={`/avance/personas/${p.userId}`} className="font-semibold underline-offset-2 hover:underline">
                    {p.name}
                  </Link>
                  <span className="block text-xs text-zinc-500">
                    {p.group ? `${p.group} · ` : ""}
                    {p.cedula}
                  </span>
                </Td>
                <Td>
                  <EnrollmentBadge status={p.status} overdue={p.overdue} />
                </Td>
                <Td>
                  <SegmentProgress completed={p.completed} total={p.total} />
                  <span className="mt-1 block text-xs text-zinc-500">
                    {p.completed} de {p.total} · {p.percent}%
                  </span>
                </Td>
                <Td>{p.avgScore === null ? <span className="text-zinc-400">—</span> : `${p.avgScore}%`}</Td>
                <Td className="text-zinc-600">{p.lastActivity ? formatDateTime(p.lastActivity) : <span className="text-zinc-400">Sin actividad</span>}</Td>
                <Td className="text-zinc-600">{p.dueAt ? formatDate(p.dueAt) : <span className="text-zinc-400">—</span>}</Td>
                <Td>
                  {p.cert ? (
                    <div className="flex flex-col items-start gap-1">
                      <CertBadge state={p.cert.state} />
                      <span className="text-xs text-zinc-500">{p.cert.expiresAt ? `hasta ${formatDate(p.cert.expiresAt)}` : "sin vencimiento"}</span>
                    </div>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      <h2 className="mb-3 mt-10 text-xl text-navy">Exámenes</h2>
      {report.quizzes.length === 0 ? (
        <Empty>Este curso no tiene exámenes con preguntas.</Empty>
      ) : (
        <div className="flex flex-col gap-4">
          {report.quizzes.map((q) => (
            <Card key={q.submoduleId}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-lg text-navy">{q.title}</h3>
                <p className="text-sm text-zinc-600">
                  {q.attempts} intento(s) de {q.people} persona(s) · aprobación {q.passRate === null ? "—" : `${q.passRate}%`} ·
                  nota media {q.avgScore === null ? "—" : `${q.avgScore}%`} · mínimo {q.passingScore}%
                </p>
              </div>
              <p className="mb-2 mt-4 text-sm font-medium text-navy">Respuestas correctas por pregunta</p>
              <ul className="flex flex-col gap-2">
                {q.questions.map((question) => (
                  <li key={question.id} className="grid items-center gap-1 sm:grid-cols-[1fr_12rem_3rem] sm:gap-4">
                    <span className="text-sm text-zinc-700">{question.text}</span>
                    <ProgressBar percent={question.correctRate ?? 0} />
                    <span className="text-sm text-zinc-600 sm:text-right">
                      {question.correctRate === null ? "—" : `${question.correctRate}%`}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}

      <h2 className="mb-3 mt-10 text-xl text-navy">Comentarios de los participantes</h2>
      {report.feedback.length === 0 ? (
        <Empty>Aún no hay comentarios.</Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {report.feedback.map((f, i) => (
            <li key={i}>
              <Card>
                <p className="whitespace-pre-line text-navy">{f.comment}</p>
                <p className="mt-2 text-xs text-zinc-500">
                  {f.name} · {formatDate(f.createdAt)}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
