import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge, Card, LinkButton, ProgressBar } from "@/components/ui";
import { itemHref } from "@/lib/course-links";
import { getCourseAccess } from "@/lib/dal";
import { getOutlineCached } from "@/lib/progress";

export const metadata: Metadata = { title: "Curso · Capacitación Gemeseg" };

export default async function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const { user, preview, enrollment } = await getCourseAccess(courseId);
  const outline = await getOutlineCached(courseId, preview ? null : user.id);
  if (!outline) notFound();

  const first = outline.items.find((i) => i.accessible);
  const target = preview ? first : (outline.next ?? first);

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h1 className="text-2xl font-semibold text-navy">{outline.course.title}</h1>
          {enrollment?.status === "COMPLETED" && <Badge tone="green">Curso completado</Badge>}
        </div>
        {outline.course.description && (
          <p className="whitespace-pre-line text-zinc-700">{outline.course.description}</p>
        )}
        {!preview && (
          <div className="flex flex-col gap-1">
            <ProgressBar percent={outline.percent} />
            <span className="text-xs text-zinc-600">
              {outline.percent}% completado · {outline.completed} de {outline.total} actividades
            </span>
          </div>
        )}
        <p className="text-sm text-zinc-600">
          {outline.course.progression === "SEQUENTIAL"
            ? "Este curso se completa en orden: cada actividad se desbloquea al terminar la anterior."
            : "Puede avanzar por las actividades en el orden que prefiera."}
        </p>
        {target ? (
          <div>
            <LinkButton href={itemHref(courseId, target)}>
              {outline.complete ? "Revisar contenido" : outline.completed > 0 ? "Continuar" : "Comenzar"}
            </LinkButton>
          </div>
        ) : (
          <p className="text-sm text-zinc-600">Este curso aún no tiene contenido.</p>
        )}
      </Card>
      {outline.complete && !preview && (
        <Card className="border-green-300 bg-green-50 text-green-900">
          ¡Felicitaciones! Completó todas las actividades de este curso.
        </Card>
      )}
    </div>
  );
}
