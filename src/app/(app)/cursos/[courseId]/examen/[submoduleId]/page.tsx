import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Badge, Button, Card, LinkButton } from "@/components/ui";
import { itemHref } from "@/lib/course-links";
import { getCourseAccess } from "@/lib/dal";
import { getPrisma } from "@/lib/prisma";
import { getOutlineCached } from "@/lib/progress";
import { shuffle } from "@/lib/quiz";
import { submitQuiz } from "../../actions";

export const metadata: Metadata = { title: "Examen · Capacitación Gemeseg" };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function QuizPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string; submoduleId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { courseId, submoduleId } = await params;
  const query = await searchParams;
  const { user, preview } = await getCourseAccess(courseId);
  const outline = await getOutlineCached(courseId, preview ? null : user.id);
  if (!outline) notFound();

  const index = outline.items.findIndex((i) => i.key === `quiz:${submoduleId}`);
  if (index < 0) notFound();
  const item = outline.items[index];
  if (!item.accessible) redirect(`/cursos/${courseId}`);
  const next = outline.items[index + 1];

  // Nunca se selecciona isCorrect: las respuestas correctas no salen del servidor.
  const quiz = await getPrisma().quiz.findUnique({
    where: { submoduleId },
    select: {
      id: true,
      passingScore: true,
      shuffleQuestions: true,
      shuffleOptions: true,
      maxAttempts: true,
      submodule: { select: { title: true } },
      questions: {
        orderBy: [{ order: "asc" }, { id: "asc" }],
        select: {
          id: true,
          type: true,
          text: true,
          options: { orderBy: { id: "asc" }, select: { id: true, text: true } },
        },
      },
    },
  });
  if (!quiz || quiz.questions.length === 0) notFound();

  const attempts = preview
    ? []
    : await getPrisma().quizAttempt.findMany({
        where: { userId: user.id, quizId: quiz.id },
        orderBy: { finishedAt: "desc" },
        select: { id: true, score: true, passed: true },
      });
  const bestScore = attempts.reduce((max, a) => Math.max(max, a.score), 0);
  const attemptId = first(query.intento);
  const justSubmitted = attemptId ? attempts.find((a) => a.id === attemptId) : undefined;
  const previewScore = first(query.vista) !== undefined ? Number(first(query.vista)) : undefined;
  const outOfAttempts = quiz.maxAttempts !== null && attempts.length >= quiz.maxAttempts && !item.done;

  const questions = (quiz.shuffleQuestions ? shuffle(quiz.questions) : quiz.questions).map((q) => ({
    ...q,
    // Verdadero/falso siempre en el mismo orden (Verdadero primero); el resto, según la configuración.
    options:
      q.type === "TRUE_FALSE"
        ? [...q.options].sort((a, b) => b.text.localeCompare(a.text))
        : quiz.shuffleOptions
          ? shuffle(q.options)
          : q.options,
  }));

  const result = justSubmitted
    ? { score: justSubmitted.score, passed: justSubmitted.passed }
    : previewScore !== undefined && !Number.isNaN(previewScore)
      ? { score: previewScore, passed: previewScore >= quiz.passingScore }
      : null;

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h1 className="text-xl font-semibold text-navy sm:text-2xl">Examen: {quiz.submodule.title}</h1>
          {item.done && <Badge tone="green">Aprobado</Badge>}
        </div>
        <p className="text-sm text-zinc-600">
          {quiz.questions.length} preguntas · Nota mínima para aprobar: {quiz.passingScore}%
          {quiz.maxAttempts !== null && ` · Intentos: ${attempts.length} de ${quiz.maxAttempts}`}
          {!preview && attempts.length > 0 && ` · Mejor nota: ${bestScore}%`}
        </p>
      </Card>

      {result && (
        <Card
          className={result.passed ? "border-green-300 bg-green-50 text-green-900" : "border-red-300 bg-red-50 text-red-900"}
        >
          <p className="text-lg font-semibold">
            {result.passed ? "¡Aprobó!" : "No alcanzó la nota mínima"} — obtuvo {result.score}%
          </p>
          {result.passed ? (
            next?.accessible && (
              <LinkButton href={itemHref(courseId, next)} className="mt-3">
                Continuar →
              </LinkButton>
            )
          ) : (
            <p className="mt-1 text-sm">Repase el contenido y vuelva a intentarlo.</p>
          )}
        </Card>
      )}

      {first(query.error) === "faltan" && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
          Responda todas las preguntas antes de enviar el examen.
        </p>
      )}

      {outOfAttempts ? (
        <Card className="text-sm text-zinc-700">
          Ya usó todos sus intentos para este examen. Comuníquese con su instructor.
        </Card>
      ) : (
        <form action={submitQuiz} className="flex flex-col gap-4">
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="submoduleId" value={submoduleId} />
          {questions.map((question, number) => {
            const multiple = question.type === "MULTIPLE_CHOICE";
            return (
              <Card key={question.id}>
                <fieldset className="flex flex-col gap-3">
                  <legend className="mb-1 font-semibold text-navy">
                    {number + 1}. {question.text}
                  </legend>
                  {multiple && <p className="text-xs text-zinc-500">Seleccione todas las respuestas correctas.</p>}
                  {question.options.map((option) => (
                    <label
                      key={option.id}
                      className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 px-3 py-2 hover:bg-zinc-50 has-[:checked]:border-brand has-[:checked]:bg-brand/5"
                    >
                      <input
                        type={multiple ? "checkbox" : "radio"}
                        name={`q_${question.id}`}
                        value={option.id}
                        className="mt-1 size-4 accent-[#ee3b1b]"
                      />
                      <span className="text-sm text-zinc-800">{option.text}</span>
                    </label>
                  ))}
                </fieldset>
              </Card>
            );
          })}
          <div>
            <Button type="submit">Enviar examen</Button>
          </div>
        </form>
      )}
    </div>
  );
}
