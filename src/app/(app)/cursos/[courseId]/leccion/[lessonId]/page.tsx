import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Badge, Button, Card, LinkButton } from "@/components/ui";
import { itemHref } from "@/lib/course-links";
import { getCourseAccess } from "@/lib/dal";
import { toEmbedUrl } from "@/lib/embed";
import { getPrisma } from "@/lib/prisma";
import { getOutlineCached } from "@/lib/progress";
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
    select: { title: true, type: true, body: true, url: true, storagePath: true, fileName: true },
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
          {item.done && <Badge tone="green">Completada</Badge>}
        </div>

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
          {item.done && next?.accessible && (
            <LinkButton href={itemHref(courseId, next)} variant="secondary">
              Siguiente
            </LinkButton>
          )}
          {!item.done && (
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
