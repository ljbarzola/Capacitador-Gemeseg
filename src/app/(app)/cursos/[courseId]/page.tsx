import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CertBadge } from "@/components/status";
import { IconDownload } from "@/components/icons";
import { Button, Card, Flash, LinkButton, SegmentProgress, Textarea } from "@/components/ui";
import { certState } from "@/lib/certificates";
import { itemHref } from "@/lib/course-links";
import { getCourseAccess } from "@/lib/dal";
import { formatDate } from "@/lib/format";
import { getPrisma } from "@/lib/prisma";
import { getOutlineCached } from "@/lib/progress";
import { restartCertification, submitFeedback } from "./actions";

export const metadata: Metadata = { title: "Curso · Capacitación Gemeseg" };

export default async function CoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { courseId } = await params;
  const query = await searchParams;
  const { user, preview, enrollment } = await getCourseAccess(courseId);
  const outline = await getOutlineCached(courseId, preview ? null : user.id);
  if (!outline) notFound();

  const prisma = getPrisma();
  const [course, cert, feedback] = await Promise.all([
    prisma.course.findUnique({ where: { id: courseId }, select: { recertMonths: true } }),
    enrollment
      ? prisma.certificate.findFirst({
          where: { enrollmentId: enrollment.id },
          orderBy: { issuedAt: "desc" },
          select: { id: true, code: true, issuedAt: true, expiresAt: true },
        })
      : null,
    enrollment
      ? prisma.courseFeedback.findUnique({
          where: { userId_courseId: { userId: user.id, courseId } },
          select: { comment: true },
        })
      : null,
  ]);

  const first_ = outline.items.find((i) => i.accessible);
  const target = preview ? first_ : (outline.next ?? first_);
  const lessons = outline.items.filter((i) => i.kind === "lesson").length;
  const quizzes = outline.items.filter((i) => i.kind === "quiz").length;
  const state = cert ? certState(cert.expiresAt) : null;
  const needsRenewal = state === "expired" || state === "expiring";
  const completed = enrollment?.status === "COMPLETED";

  const meta = [
    ["Contenido", `${lessons} lección(es)${quizzes ? ` y ${quizzes} examen(es)` : ""}`],
    ["Avance", outline.course.progression === "SEQUENTIAL" ? "En orden: cada actividad se desbloquea al terminar la anterior" : "Libre: puede elegir el orden"],
    ["Certificado", course?.recertMonths ? `Vigencia de ${course.recertMonths} meses` : "Sin vencimiento"],
  ];

  return (
    <div className="flex flex-col gap-5">
      <Flash ok={query.ok} />
      <Card className="flex flex-col gap-6 p-6 sm:p-8">
        <div>
          <p className="mb-2 text-sm text-zinc-500">
            <Link href="/panel" className="underline underline-offset-2">
              Mis cursos
            </Link>
          </p>
          <h1 className="text-3xl leading-tight text-navy">{outline.course.title}</h1>
          {outline.course.description && (
            <p className="mt-3 max-w-prose whitespace-pre-line leading-relaxed text-zinc-700">{outline.course.description}</p>
          )}
        </div>

        <dl className="grid gap-x-8 gap-y-3 border-y border-zinc-200 py-4 text-sm sm:grid-cols-3">
          {meta.map(([label, value]) => (
            <div key={label}>
              <dt className="text-zinc-500">{label}</dt>
              <dd className="mt-0.5 font-medium text-navy">{value}</dd>
            </div>
          ))}
        </dl>

        {!preview && (
          <div>
            <SegmentProgress completed={outline.completed} total={outline.total} />
            <p className="mt-2 text-sm text-zinc-600">
              {outline.completed} de {outline.total} actividades completadas
            </p>
          </div>
        )}

        {target ? (
          <div>
            <LinkButton href={itemHref(courseId, target)} className="min-h-11 px-6">
              {outline.complete ? "Revisar contenido" : outline.completed > 0 ? "Continuar" : "Comenzar curso"}
            </LinkButton>
          </div>
        ) : (
          <p className="text-sm text-zinc-600">Este curso aún no tiene contenido.</p>
        )}
      </Card>

      {!preview && cert && state && (
        <Card className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl text-navy">Su certificado</h2>
              <p className="mt-1 text-sm text-zinc-600">
                Emitido el {formatDate(cert.issuedAt)} ·{" "}
                {cert.expiresAt ? `válido hasta el ${formatDate(cert.expiresAt)}` : "sin vencimiento"} · código{" "}
                <span className="font-mono text-xs">{cert.code}</span>
              </p>
            </div>
            <CertBadge state={state} />
          </div>
          <div className="flex flex-wrap gap-2">
            <LinkButton href={`/api/certificados/${cert.id}`} variant="dark" prefetch={false}>
              <IconDownload /> Descargar certificado (PDF)
            </LinkButton>
            {needsRenewal && (
              <form action={restartCertification}>
                <input type="hidden" name="courseId" value={courseId} />
                <Button type="submit">Renovar certificación</Button>
              </form>
            )}
          </div>
          {needsRenewal && (
            <p className="text-sm text-zinc-600">
              {state === "expired"
                ? "Su certificado venció. Para renovarlo debe volver a completar el curso."
                : "Su certificado está por vencer. Puede renovarlo ahora: volverá a completar el curso y recibirá uno nuevo."}
            </p>
          )}
        </Card>
      )}

      {!preview && completed && (
        <Card>
          <h2 className="text-xl text-navy">¿Cómo le fue con este curso?</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Sus comentarios ayudan a mejorar las capacitaciones. Es opcional.
          </p>
          <form action={submitFeedback} className="mt-4 flex flex-col gap-3">
            <input type="hidden" name="courseId" value={courseId} />
            <Textarea
              name="comment"
              rows={4}
              maxLength={3000}
              defaultValue={feedback?.comment ?? ""}
              placeholder="Escriba aquí lo que le pareció útil y lo que mejoraría."
              aria-label="Comentarios sobre el curso"
              required
            />
            <div>
              <Button type="submit" variant="secondary">
                {feedback ? "Actualizar comentarios" : "Enviar comentarios"}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
