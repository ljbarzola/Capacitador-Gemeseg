import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmDialogButton } from "@/components/confirm-dialog-button";
import { Badge, Card, Flash, PageHeader } from "@/components/ui";
import { requireStaff } from "@/lib/dal";
import { first } from "@/lib/form";
import { getPrisma } from "@/lib/prisma";
import { toDateTimeParts } from "@/lib/sessions";
import { deleteCard } from "../../../actions";
import { CardForm } from "./card-form";
import { LessonForm } from "./lesson-form";

const CARD_TYPE_LABEL = {
  SINGLE_CHOICE: "Opción única",
  MULTIPLE_CHOICE: "Selección múltiple",
  TRUE_FALSE: "Verdadero o falso",
} as const;

export const metadata: Metadata = { title: "Lección · Capacitación Gemeseg" };

// lessonId = "nueva" crea una lección en el submódulo indicado por ?submodulo=
export default async function LessonEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireStaff();
  const { courseId, lessonId } = await params;
  const query = await searchParams;
  const prisma = getPrisma();

  let initial = null;
  let submoduleId: string | undefined;

  if (lessonId === "nueva") {
    submoduleId = first(query.submodulo);
    const submodule = submoduleId
      ? await prisma.submodule.findFirst({ where: { id: submoduleId, module: { courseId } }, select: { id: true } })
      : null;
    if (!submodule) notFound();
  } else {
    const lesson = await prisma.lesson.findFirst({
      where: { id: lessonId, submodule: { module: { courseId } } },
      select: {
        id: true,
        title: true,
        type: true,
        body: true,
        url: true,
        storagePath: true,
        fileName: true,
        startsAt: true,
        instructorId: true,
        cards: {
          orderBy: [{ order: "asc" }, { id: "asc" }],
          select: {
            id: true,
            type: true,
            text: true,
            feedback: true,
            options: { orderBy: { id: "asc" }, select: { text: true, isCorrect: true } },
          },
        },
      },
    });
    if (!lesson) notFound();
    initial = lesson;
  }

  const instructors = await prisma.user.findMany({
    where: { active: true, role: { in: ["INSTRUCTOR", "ADMIN"] } },
    orderBy: [{ lastNames: "asc" }, { firstNames: "asc" }],
    select: { id: true, firstNames: true, lastNames: true },
  });
  const when = initial?.startsAt ? toDateTimeParts(initial.startsAt) : null;

  return (
    <>
      <PageHeader title={initial ? "Editar lección" : "Nueva lección"} />
      <Flash ok={query.ok} error={query.error} />
      <Card className="max-w-3xl">
        <LessonForm
          courseId={courseId}
          submoduleId={submoduleId}
          initial={
            initial
              ? {
                  id: initial.id,
                  title: initial.title,
                  type: initial.type,
                  body: initial.body,
                  url: initial.url,
                  storagePath: initial.storagePath,
                  fileName: initial.fileName,
                  sessionDate: when?.date ?? "",
                  sessionTime: when?.time ?? "",
                  instructorId: initial.instructorId ?? "",
                }
              : undefined
          }
          instructors={instructors.map((u) => ({ id: u.id, name: `${u.lastNames} ${u.firstNames}` }))}
        />
      </Card>

      {initial?.type === "CARDS" && (
        <section className="mt-8 flex max-w-3xl flex-col gap-4" aria-labelledby="fichas">
          <h2 id="fichas" className="text-lg font-semibold text-navy">
            Fichas ({initial.cards.length})
          </h2>
          <p className="text-sm text-zinc-600">
            Cada ficha tiene una pregunta con varias opciones. Al responder, la persona ve una ventana con la retroalimentación (acierte o no).
            Son formativas: no cuentan para la nota.
          </p>
          {initial.cards.length === 0 && <p className="text-sm text-zinc-500">Todavía no hay fichas. Agregue la primera abajo.</p>}
          <ul className="flex flex-col gap-3">
            {initial.cards.map((card, index) => (
              <li key={card.id}>
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-semibold text-navy">
                      {index + 1}. {card.text}
                    </p>
                    <Badge>{CARD_TYPE_LABEL[card.type]}</Badge>
                  </div>
                  <ul className="mt-2 flex flex-col gap-1 text-sm">
                    {card.options.map((option, i) => (
                      <li key={i} className={option.isCorrect ? "font-semibold text-green-800" : "text-zinc-700"}>
                        {option.isCorrect ? "✓" : "•"} {option.text}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-600">
                    <span className="font-semibold text-navy">Retroalimentación: </span>
                    {card.feedback}
                  </p>
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm font-semibold text-navy">Editar</summary>
                    <div className="mt-3 border-t border-zinc-200 pt-3">
                      <CardForm
                        courseId={courseId}
                        lessonId={initial.id}
                        card={{
                          id: card.id,
                          type: card.type,
                          text: card.text,
                          feedback: card.feedback,
                          options: card.options.map((o) => ({ text: o.text, correct: o.isCorrect })),
                        }}
                      />
                      <form action={deleteCard} className="mt-3">
                        <input type="hidden" name="id" value={card.id} />
                        <input type="hidden" name="courseId" value={courseId} />
                        <input type="hidden" name="lessonId" value={initial.id} />
                        <ConfirmDialogButton title="Eliminar ficha" message="¿Eliminar esta ficha? No se puede deshacer.">
                          Eliminar ficha
                        </ConfirmDialogButton>
                      </form>
                    </div>
                  </details>
                </Card>
              </li>
            ))}
          </ul>
          <Card>
            <h3 className="mb-4 text-lg font-semibold text-navy">Nueva ficha</h3>
            <CardForm courseId={courseId} lessonId={initial.id} />
          </Card>
        </section>
      )}

      <p className="mt-6 text-sm">
        <Link href={`/admin/cursos/${courseId}`} className="text-zinc-600 underline">
          ← Volver al curso
        </Link>
      </p>
    </>
  );
}
