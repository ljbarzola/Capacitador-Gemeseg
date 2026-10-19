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
import { FinishModuleForm } from "./finish-module-form";

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
  const [course, cert, moduleCerts, feedback] = await Promise.all([
    prisma.course.findUnique({ where: { id: courseId }, select: { recertMonths: true } }),
    enrollment
      ? prisma.certificate.findFirst({
          where: { enrollmentId: enrollment.id, kind: "COURSE" },
          orderBy: { issuedAt: "desc" },
          select: { id: true, code: true, issuedAt: true, expiresAt: true },
        })
      : null,
    enrollment
      ? prisma.certificate.findMany({
          where: { enrollmentId: enrollment.id, kind: "MODULE" },
          orderBy: { issuedAt: "desc" },
          select: { id: true, code: true, moduleId: true, moduleTitle: true, issuedAt: true, expiresAt: true },
        })
      : [],
    enrollment
      ? prisma.courseFeedback.findUnique({
          where: { userId_courseId: { userId: user.id, courseId } },
          select: { comment: true },
        })
      : null,
  ]);

  // Un certificado por módulo (el más reciente), en el orden de los módulos del curso.
  const latestByModule = new Map<string, (typeof moduleCerts)[number]>();
  for (const c of moduleCerts) if (c.moduleId && !latestByModule.has(c.moduleId)) latestByModule.set(c.moduleId, c);
  const withItems = outline.modules.filter((m) => !m.empty);
  const moduleCertList = withItems.flatMap((m) => {
    const found = latestByModule.get(m.id);
    return found ? [found] : [];
  });
  const current = preview ? undefined : outline.modules.find((m) => m.id === outline.currentModuleId);
  const currentNumber = current ? withItems.findIndex((m) => m.id === current.id) + 1 : 0;
  const currentItems = current ? current.submodules.flatMap((s) => s.items) : [];
  const justFinished = typeof query.finalizado === "string" ? outline.modules.find((m) => m.id === query.finalizado) : undefined;

  const accent = (await getCourseAccents()).get(courseId) ?? accentFor(courseId);
  const firstOpen = outline.items.find((i) => i.accessible);
  const target = preview ? firstOpen : (outline.next ?? firstOpen);
  const sessions = outline.items.filter((i) => i.lessonType === "SESSION").length;
  const lessons = outline.items.filter((i) => i.kind === "lesson").length - sessions;
  const quizzes = outline.items.filter((i) => i.kind === "quiz").length;
  const state = cert ? certState(cert.expiresAt) : null;
  const needsRenewal = state === "expired" || state === "expiring";
  const completed = enrollment?.status === "COMPLETED";

  const meta = [
    {
      icon: <IconBook />,
      label: "Contenido",
      value: [lessons ? `${lessons} lección(es)` : "", sessions ? `${sessions} sesión(es) en vivo` : "", quizzes ? `${quizzes} examen(es)` : ""].filter(Boolean).join(", "),
    },
    {
      icon: <IconList />,
      label: "Avance",
      value: preview
        ? outline.course.progression === "SEQUENTIAL"
          ? "En orden: cada actividad se desbloquea al terminar la anterior"
          : "Libre: puede elegir el orden"
        : `Un módulo a la vez${withItems.length > 1 ? ` (${withItems.length} módulos)` : ""}. ${
            outline.course.progression === "SEQUENTIAL" ? "Dentro de cada módulo, en orden" : "Dentro de cada módulo, el orden es libre"
          }`,
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

      {justFinished && (
        <p role="status" className="enter rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-950">
          <strong>¡Módulo finalizado!</strong> «{justFinished.title}»
          {justFinished.issuesCertificate ? " — su certificado de módulo ya está disponible abajo." : "."}
          {outline.complete ? " Completó todo el curso." : current ? " Ya puede empezar el siguiente módulo." : ""}
        </p>
      )}

      {!preview && current && !outline.complete && (
        <Card className="enter flex flex-col gap-3" style={{ "--i": 1 } as React.CSSProperties}>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Módulo {currentNumber} de {withItems.length}
          </p>
          <h2 className="text-xl text-navy">{current.title}</h2>
          <p className="text-sm text-zinc-600">
            {currentItems.filter((i) => i.lessonType !== "SESSION" && i.done).length} de{" "}
            {currentItems.filter((i) => i.lessonType !== "SESSION").length} actividades de este módulo completadas.
          </p>
          {current.ready && !current.finalized ? (
            <div className="flex flex-col gap-2 rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="text-sm text-green-950">
                Terminó todas las actividades. Al finalizar el módulo
                {current.issuesCertificate ? " recibirá su certificado de módulo y" : ""}{" "}
                {withItems[withItems.length - 1]?.id === current.id ? "completará el curso." : "se abrirá el siguiente módulo."}
              </p>
              <div>
                <FinishModuleForm
                  courseId={courseId}
                  moduleId={current.id}
                  last={withItems[withItems.length - 1]?.id === current.id}
                  issuesCertificate={current.issuesCertificate}
                />
              </div>
            </div>
          ) : current.finalized ? (
            <p className="text-sm text-zinc-600">Módulo finalizado.</p>
          ) : null}
        </Card>
      )}

      {!preview && moduleCertList.length > 0 && (
        <Card className="enter flex flex-col gap-3" style={{ "--i": 1 } as React.CSSProperties}>
          <div className="flex items-start gap-3.5">
            <IconChip accent={accentFor("certificado-modulo")}>
              <IconAward />
            </IconChip>
            <div>
              <h2 className="text-xl text-navy">Certificados de módulo</h2>
              <p className="mt-1 text-sm text-zinc-600">Uno por cada módulo que finalizó.</p>
            </div>
          </div>
          <ul className="flex flex-col divide-y divide-zinc-200 text-sm">
            {moduleCertList.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div>
                  <span className="font-medium text-navy">{c.moduleTitle}</span>
                  <span className="block text-xs text-zinc-500">
                    Emitido el {formatDate(c.issuedAt)} · {c.expiresAt ? `válido hasta el ${formatDate(c.expiresAt)}` : "sin vencimiento"} ·{" "}
                    <span className="font-mono">{c.code}</span>
                  </span>
                </div>
                <LinkButton href={`/api/certificados/${c.id}`} variant="secondary" prefetch={false}>
                  <IconDownload /> Descargar PDF
                </LinkButton>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {!preview && cert && state && (
        <Card className="enter flex flex-col gap-4" style={{ "--i": 1 } as React.CSSProperties}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3.5">
              <IconChip accent={accentFor("certificado")}>
                <IconAward />
              </IconChip>
              <div>
                <h2 className="text-xl text-navy">Su certificado final</h2>
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
