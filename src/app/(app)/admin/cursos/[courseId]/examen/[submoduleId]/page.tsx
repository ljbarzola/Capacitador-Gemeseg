import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/confirm-button";
import { Badge, Button, Card, Field, Flash, Input, PageHeader } from "@/components/ui";
import { requireStaff } from "@/lib/dal";
import { getPrisma } from "@/lib/prisma";
import { deleteQuestion, deleteQuiz, saveQuizSettings } from "../../../actions";
import { QuestionForm } from "./question-form";

export const metadata: Metadata = { title: "Examen · Capacitación Gemeseg" };

const TYPE_LABEL = {
  SINGLE_CHOICE: "Opción única",
  MULTIPLE_CHOICE: "Selección múltiple",
  TRUE_FALSE: "Verdadero o falso",
} as const;

export default async function QuizEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string; submoduleId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireStaff();
  const { courseId, submoduleId } = await params;
  const query = await searchParams;

  const submodule = await getPrisma().submodule.findFirst({
    where: { id: submoduleId, module: { courseId } },
    select: {
      title: true,
      quiz: {
        select: {
          id: true,
          passingScore: true,
          shuffleQuestions: true,
          shuffleOptions: true,
          maxAttempts: true,
          questions: {
            orderBy: [{ order: "asc" }, { id: "asc" }],
            select: {
              id: true,
              type: true,
              text: true,
              options: { orderBy: { id: "asc" }, select: { text: true, isCorrect: true } },
            },
          },
        },
      },
    },
  });
  if (!submodule) notFound();
  const quiz = submodule.quiz;

  return (
    <>
      <PageHeader title={`Examen: ${submodule.title}`} subtitle="Se califica automáticamente al enviarlo." />
      <Flash ok={query.ok} error={query.error} />

      <Card className="mb-6 max-w-3xl">
        <h2 className="mb-4 text-lg font-semibold text-navy">Configuración</h2>
        <form action={saveQuizSettings} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="submoduleId" value={submoduleId} />
          <Field label="Nota mínima para aprobar (%)">
            <Input name="passingScore" type="number" min={1} max={100} defaultValue={quiz?.passingScore ?? 70} required />
          </Field>
          <Field label="Máximo de intentos" hint="Vacío = ilimitados.">
            <Input name="maxAttempts" type="number" min={1} defaultValue={quiz?.maxAttempts ?? ""} />
          </Field>
          <label className="flex items-center gap-2 text-sm font-medium text-navy">
            <input
              type="checkbox"
              name="shuffleQuestions"
              defaultChecked={quiz?.shuffleQuestions ?? true}
              className="size-4 accent-[#ee3b1b]"
            />
            Orden aleatorio de preguntas
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-navy">
            <input
              type="checkbox"
              name="shuffleOptions"
              defaultChecked={quiz?.shuffleOptions ?? true}
              className="size-4 accent-[#ee3b1b]"
            />
            Orden aleatorio de opciones
          </label>
          <div className="sm:col-span-2">
            <Button type="submit">{quiz ? "Guardar configuración" : "Crear examen"}</Button>
          </div>
        </form>
      </Card>

      {quiz && (
        <>
          <h2 className="mb-3 text-lg font-semibold text-navy">Preguntas ({quiz.questions.length})</h2>
          {quiz.questions.length === 0 && (
            <p className="mb-4 text-sm text-zinc-600">
              El examen no se mostrará a los estudiantes hasta que tenga al menos una pregunta.
            </p>
          )}
          <ul className="mb-6 flex flex-col gap-3">
            {quiz.questions.map((question, index) => (
              <li key={question.id}>
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-semibold text-navy">
                      {index + 1}. {question.text}
                    </p>
                    <Badge>{TYPE_LABEL[question.type]}</Badge>
                  </div>
                  <ul className="mt-2 flex flex-col gap-1 text-sm">
                    {question.options.map((option, i) => (
                      <li key={i} className={option.isCorrect ? "font-semibold text-green-800" : "text-zinc-700"}>
                        {option.isCorrect ? "✓" : "•"} {option.text}
                      </li>
                    ))}
                  </ul>
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm font-semibold text-navy">Editar</summary>
                    <div className="mt-3 border-t border-zinc-200 pt-3">
                      <QuestionForm
                        courseId={courseId}
                        submoduleId={submoduleId}
                        question={{
                          id: question.id,
                          type: question.type,
                          text: question.text,
                          options: question.options.map((o) => ({ text: o.text, correct: o.isCorrect })),
                        }}
                      />
                      <form action={deleteQuestion} className="mt-3">
                        <input type="hidden" name="id" value={question.id} />
                        <input type="hidden" name="courseId" value={courseId} />
                        <input type="hidden" name="submoduleId" value={submoduleId} />
                        <ConfirmButton variant="danger" message="¿Eliminar esta pregunta?">
                          Eliminar pregunta
                        </ConfirmButton>
                      </form>
                    </div>
                  </details>
                </Card>
              </li>
            ))}
          </ul>

          <Card className="max-w-3xl">
            <h2 className="mb-4 text-lg font-semibold text-navy">Nueva pregunta</h2>
            <QuestionForm courseId={courseId} submoduleId={submoduleId} />
          </Card>

          <form action={deleteQuiz} className="mt-8">
            <input type="hidden" name="courseId" value={courseId} />
            <input type="hidden" name="submoduleId" value={submoduleId} />
            <ConfirmButton variant="danger" message="¿Eliminar el examen completo con sus preguntas y los intentos registrados?">
              Eliminar examen
            </ConfirmButton>
          </form>
        </>
      )}

      <p className="mt-6 text-sm">
        <Link href={`/admin/cursos/${courseId}`} className="text-zinc-600 underline">
          ← Volver al curso
        </Link>
      </p>
    </>
  );
}
