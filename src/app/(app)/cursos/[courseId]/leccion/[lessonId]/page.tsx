import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { IconCalendar, IconClock, IconUsers } from "@/components/icons";
import { Badge, Button, Card, LinkButton } from "@/components/ui";
import { itemHref } from "@/lib/course-links";
import { getCourseAccess } from "@/lib/dal";
import { formatLongDate, formatTime } from "@/lib/format";
import { toEmbedUrl } from "@/lib/embed";
import { getPrisma } from "@/lib/prisma";
import { getOutlineCached } from "@/lib/progress";
import { ATTENDANCE_LABEL, meetingProvider, PHASE_LABEL, sessionPhase } from "@/lib/sessions";
import { createReadUrl } from "@/lib/storage";
import { completeLesson } from "../../actions";

export const metadata: Metadata = { title: "Lección · Capacitación Gemeseg" };

export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { courseId, lessonId } = await params;
  const { user, preview } = await getCourseAccess(courseId);
  const outline = await getOutlineCached(courseId, preview ? null : user.id);
  if (!outline) notFound();

  const index = outline.items.findIndex((i) => i.key === `lesson:${lessonId}`);
  if (index < 0) notFound();
  const item = outline.items[index];
  if (!item.accessible) redirect(`/cursos/${courseId}`);

  const lesson = await getPrisma().lesson.findUnique({
    where: { id: lessonId },
    select: {
      title: true,
      type: true,
      body: true,
      url: true,
      storagePath: true,
      fileName: true,
      startsAt: true,
      instructor: { select: { firstNames: true, lastNames: true } },
    },
  });
  if (!lesson) notFound();

  const fileUrl = lesson.storagePath
    ? await createReadUrl(lesson.storagePath, lesson.type === "FILE" ? (lesson.fileName ?? undefined) : undefined)
    : null;
  const embedUrl = lesson.type === "VIDEO_EMBED" && lesson.url ? toEmbedUrl(lesson.url) : null;

  const previous = outline.items[index - 1];
  const next = outline.items[index + 1];

  return (
    <article className="flex flex-col gap-4">
      <Card className="flex flex-col gap-5 p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h1 className="text-2xl text-navy sm:text-[1.7rem]">{lesson.title}</h1>
          {lesson.type === "SESSION" && lesson.startsAt ? (
            <Badge tone={sessionPhase(lesson.startsAt) === "live" ? "green" : sessionPhase(lesson.startsAt) === "scheduled" ? "blue" : "gray"}>
              {PHASE_LABEL[sessionPhase(lesson.startsAt)]}
            </Badge>
          ) : (
            item.done && <Badge tone="green">Completada</Badge>
          )}
        </div>

        {lesson.type === "SESSION" && (
          <div className="flex flex-col gap-5">
            <dl className="grid gap-4 rounded-lg border border-teal-200 bg-teal-50/60 p-5 sm:grid-cols-3">
              <div className="flex items-start gap-2.5">
                <IconCalendar className="mt-0.5 text-teal-700" />
                <div>
                  <dt className="text-sm text-zinc-600">Fecha</dt>
                  <dd className="mt-0.5 font-medium text-navy first-letter:uppercase">{lesson.startsAt ? formatLongDate(lesson.startsAt) : "Por definir"}</dd>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <IconClock className="mt-0.5 text-teal-700" />
                <div>
                  <dt className="text-sm text-zinc-600">Hora de inicio</dt>
                  <dd className="mt-0.5 font-medium text-navy">
                    {lesson.startsAt ? formatTime(lesson.startsAt) : "Por definir"}
                    <span className="block text-xs font-normal text-zinc-500">Hora de Ecuador</span>
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <IconUsers className="mt-0.5 text-teal-700" />
                <div>
                  <dt className="text-sm text-zinc-600">Instructor</dt>
                  <dd className="mt-0.5 font-medium text-navy">
                    {lesson.instructor ? `${lesson.instructor.firstNames} ${lesson.instructor.lastNames}` : "Por definir"}
                  </dd>
                </div>
              </div>
            </dl>

            {lesson.body && (
              <section aria-labelledby="indicaciones">
                <h2 id="indicaciones" className="mb-2 text-lg text-navy">
                  Indicaciones
                </h2>
                <div className="max-w-prose whitespace-pre-wrap break-words leading-[1.7] text-zinc-800">{lesson.body}</div>
              </section>
            )}

            {lesson.url && (
              <div>
                <a
                  href={lesson.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex min-h-11 items-center gap-2 rounded-md px-5 py-2.5 font-semibold text-white transition-colors ${
                    lesson.startsAt && sessionPhase(lesson.startsAt) === "live" ? "bg-[#d6341a] hover:bg-[#bd2d16]" : "bg-navy hover:bg-[#1d1b4b]"
                  }`}
                >
                  Unirme a la sesión
                  <span className="text-sm font-normal opacity-80">({meetingProvider(lesson.url)})</span>
                </a>
                <p className="mt-2 break-all text-xs text-zinc-500">{lesson.url}</p>
              </div>
            )}

            {!preview && (
              <p
                className={`rounded-md border-l-4 px-4 py-3 text-sm ${
                  item.attendance === "ATTENDED" || item.attendance === "EXCUSED"
                    ? "border-green-700 bg-green-50 text-green-900"
                    : item.attendance === "ABSENT"
                      ? "border-red-600 bg-red-50 text-red-900"
                      : "border-zinc-300 bg-zinc-50 text-zinc-700"
                }`}
              >
                {item.attendance
                  ? `Su asistencia: ${ATTENDANCE_LABEL[item.attendance]}.`
                  : lesson.startsAt && sessionPhase(lesson.startsAt) === "finished"
                    ? "Su asistencia aún no está registrada. La registra el instructor."
                    : "Su asistencia la registra el instructor durante o después de la sesión. Esta actividad cuenta para completar el curso."}
              </p>
            )}
          </div>
        )}

        {lesson.type === "TEXT" && (
          <div className="whitespace-pre-wrap break-words max-w-prose leading-[1.7] text-zinc-800">{lesson.body}</div>
        )}

        {lesson.type === "VIDEO_EMBED" &&
          (embedUrl ? (
            <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
              <iframe
                src={embedUrl}
                title={lesson.title}
                className="size-full"
                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          ) : (
            <Unavailable />
          ))}

        {lesson.type === "VIDEO_UPLOAD" &&
          (fileUrl ? (
            <video src={fileUrl} controls preload="metadata" className="w-full rounded-xl bg-black" />
          ) : (
            <Unavailable />
          ))}

        {lesson.type === "IMAGE" &&
          (fileUrl || lesson.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fileUrl ?? lesson.url ?? ""} alt={lesson.title} className="max-h-[70vh] w-auto max-w-full rounded-xl" />
          ) : (
            <Unavailable />
          ))}

        {lesson.type === "LINK" && lesson.url && (
          <div>
            <a
              href={lesson.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center gap-2 rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1d1b4b]"
            >
              Abrir enlace
            </a>
            <p className="mt-2 break-all text-xs text-zinc-500">{lesson.url}</p>
          </div>
        )}

        {lesson.type === "FILE" &&
          (fileUrl ? (
            <div>
              <a
                href={fileUrl}
                className="inline-flex min-h-10 items-center gap-2 rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1d1b4b]"
              >
                Descargar {lesson.fileName ?? "archivo"}
              </a>
            </div>
          ) : (
            <Unavailable />
          ))}
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {previous?.accessible && (
            <LinkButton href={itemHref(courseId, previous)} variant="secondary">
              Anterior
            </LinkButton>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(item.done || lesson.type === "SESSION") && next?.accessible && (
            <LinkButton href={itemHref(courseId, next)} variant="secondary">
              Siguiente
            </LinkButton>
          )}
          {!item.done && lesson.type !== "SESSION" && (
            <form action={completeLesson}>
              <input type="hidden" name="courseId" value={courseId} />
              <input type="hidden" name="lessonId" value={lessonId} />
              <Button type="submit">{preview ? "Siguiente" : "Marcar como completada y continuar"}</Button>
            </form>
          )}
        </div>
      </div>
    </article>
  );
}

function Unavailable() {
  return (
    <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
      Este contenido no está disponible por el momento. Avise a su instructor.
    </p>
  );
}
