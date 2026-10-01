import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CertBadge } from "@/components/status";
import { IconAward, IconBook, IconClock, IconDownload, IconList } from "@/components/icons";
import { Button, Card, IconChip, LinkButton, SegmentProgress, accentFor } from "@/components/ui";
import { getCourseAccents } from "@/lib/accents";
import { certState } from "@/lib/certificates";
import { itemHref } from "@/lib/course-links";
import { getCourseAccess } from "@/lib/dal";
import { formatDate } from "@/lib/format";
import { getPrisma } from "@/lib/prisma";
import { getOutlineCached } from "@/lib/progress";
import { restartCertification } from "./actions";
import { FeedbackForm } from "./feedback-form";

export const metadata: Metadata = { title: "Curso · Capacitación Gemeseg" };

export default async function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
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

  const accent = (await getCourseAccents()).get(courseId) ?? accentFor(courseId);
  const firstOpen = outline.items.find((i) => i.accessible);
  const target = preview ? firstOpen : (outline.next ?? firstOpen);
  const lessons = outline.items.filter((i) => i.kind === "lesson").length;
  const quizzes = outline.items.filter((i) => i.kind === "quiz").length;
  const state = cert ? certState(cert.expiresAt) : null;
  const needsRenewal = state === "expired" || state === "expiring";
  const completed = enrollment?.status === "COMPLETED";

  const meta = [
    {
      icon: <IconBook />,
      label: "Contenido",
      value: `${lessons} lección(es)${quizzes ? ` y ${quizzes} examen(es)` : ""}`,
    },
    {
      icon: <IconList />,
      label: "Avance",
      value: outline.course.progression === "SEQUENTIAL" ? "En orden: cada actividad se desbloquea al terminar la anterior" : "Libre: puede elegir el orden",
    },
    {
      icon: <IconClock />,
      label: "Certificado",
      value: course?.recertMonths ? `Vigencia de ${course.recertMonths} meses` : "Sin vencimiento",
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <Card accent={accent} className="enter flex flex-col gap-6 p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <IconChip accent={accent} size="lg">
            <IconBook />
          </IconChip>
          <div className="min-w-0">
            <p className="mb-1 text-sm text-zinc-500">
              <Link href="/panel" className="underline underline-offset-2 hover:text-navy">
                Mis cursos
              </Link>
            </p>
            <h1 className="text-3xl leading-tight text-navy">{outline.course.title}</h1>
            {outline.course.description && (
              <p className="mt-3 max-w-prose whitespace-pre-line leading-relaxed text-zinc-700">{outline.course.description}</p>
            )}
          </div>
        </div>

        <dl className="grid gap-4 border-y border-zinc-200 py-5 text-sm sm:grid-cols-3">
          {meta.map((item) => (
            <div key={item.label} className="flex items-start gap-2.5">
              <span className={`mt-0.5 ${accent.text}`} aria-hidden>
                {item.icon}
              </span>
              <div>
                <dt className="text-zinc-500">{item.label}</dt>
                <dd className="mt-0.5 font-medium text-navy">{item.value}</dd>
              </div>
            </div>
          ))}
        </dl>

        {!preview && (
          <div>
            <SegmentProgress completed={outline.completed} total={outline.total} accent={accent} />
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
        <Card className="enter flex flex-col gap-4" style={{ "--i": 1 } as React.CSSProperties}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3.5">
              <IconChip accent={accentFor("certificado")}>
                <IconAward />
              </IconChip>
              <div>
                <h2 className="text-xl text-navy">Su certificado</h2>
                <p className="mt-1 text-sm text-zinc-600">
                  Emitido el {formatDate(cert.issuedAt)} ·{" "}
                  {cert.expiresAt ? `válido hasta el ${formatDate(cert.expiresAt)}` : "sin vencimiento"} · código{" "}
                  <span className="font-mono text-xs">{cert.code}</span>
                </p>
              </div>
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
        <Card className="enter" style={{ "--i": 2 } as React.CSSProperties}>
          <h2 className="text-xl text-navy">¿Cómo le fue con este curso?</h2>
          <p className="mt-1 text-sm text-zinc-600">Sus comentarios ayudan a mejorar las capacitaciones. Es opcional.</p>
          <FeedbackForm courseId={courseId} initial={feedback?.comment ?? ""} />
        </Card>
      )}
    </div>
  );
}
