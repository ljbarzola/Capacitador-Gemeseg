"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { IconCheck } from "@/components/icons";
import { Button } from "@/components/ui";
import { answerCard } from "../../actions";

type CardData = {
  id: string;
  type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE";
  text: string;
  options: { id: string; text: string }[];
};

type Result = { question: string; correct: boolean; feedback: string; correctTexts: string[] };

// Fichas de pregunta y respuesta: la persona elige una respuesta, pulsa el botón y ve siempre una
// ventana con la retroalimentación (acierte o no). Es formativo: no se guarda nada y puede reintentar.
// La corrección ocurre en el servidor; las respuestas correctas llegan solo después de responder.
export function CardsPlayer({ courseId, lessonId, cards }: { courseId: string; lessonId: string; cards: CardData[] }) {
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [status, setStatus] = useState<Record<string, "correct" | "wrong">>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (result && dialog && !dialog.open) dialog.showModal();
  }, [result]);

  function choose(card: CardData, optionId: string, checked: boolean) {
    setErrors((current) => ({ ...current, [card.id]: "" }));
    setPicked((current) => {
      const now = current[card.id] ?? [];
      const next = card.type === "MULTIPLE_CHOICE" ? (checked ? [...now, optionId] : now.filter((id) => id !== optionId)) : [optionId];
      return { ...current, [card.id]: next };
    });
  }

  function respond(card: CardData) {
    const optionIds = picked[card.id] ?? [];
    if (optionIds.length === 0) {
      setErrors((current) => ({ ...current, [card.id]: "Elija una respuesta antes de continuar." }));
      return;
    }
    setBusy(card.id);
    startTransition(async () => {
      try {
        const answer = await answerCard({ courseId, lessonId, cardId: card.id, optionIds });
        if (!answer.ok) {
          setErrors((current) => ({ ...current, [card.id]: answer.message }));
          return;
        }
        setStatus((current) => ({ ...current, [card.id]: answer.correct ? "correct" : "wrong" }));
        setResult({
          question: card.text,
          correct: answer.correct,
          feedback: answer.feedback,
          correctTexts: card.options.filter((o) => answer.correctOptionIds.includes(o.id)).map((o) => o.text),
        });
      } catch {
        setErrors((current) => ({ ...current, [card.id]: "No se pudo comprobar la respuesta. Intente de nuevo." }));
      } finally {
        setBusy(null);
      }
    });
  }

  if (cards.length === 0) {
    return <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">Esta lección aún no tiene fichas.</p>;
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => {
          const multiple = card.type === "MULTIPLE_CHOICE";
          const state = status[card.id];
          return (
            <section
              key={card.id}
              aria-labelledby={`ficha-${card.id}`}
              className={`flex flex-col gap-3 rounded-xl border-2 p-4 ${
                state === "correct" ? "border-green-600 bg-green-50/50" : "border-zinc-200 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h2 id={`ficha-${card.id}`} className="font-semibold leading-snug text-navy">
                  {card.text}
                </h2>
                {state === "correct" && (
                  <span
                    role="img"
                    aria-label="Respondida correctamente"
                    className="mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full bg-green-700 text-white"
                  >
                    <IconCheck width={12} height={12} strokeWidth={2.4} />
                  </span>
                )}
              </div>
              {multiple && <p className="text-xs text-zinc-500">Seleccione todas las respuestas correctas.</p>}
              <div className="flex flex-col gap-2">
                {card.options.map((option) => (
                  <label
                    key={option.id}
                    className="flex cursor-pointer items-start gap-3 rounded-md border border-zinc-200 px-3 py-2.5 hover:bg-zinc-50 has-[:checked]:border-navy has-[:checked]:bg-zinc-50"
                  >
                    <input
                      type={multiple ? "checkbox" : "radio"}
                      name={`ficha_${card.id}`}
                      value={option.id}
                      checked={(picked[card.id] ?? []).includes(option.id)}
                      onChange={(event) => choose(card, option.id, event.target.checked)}
                      className="mt-0.5 size-4 accent-[#100f31]"
                    />
                    <span className="text-sm text-zinc-800">{option.text}</span>
                  </label>
                ))}
              </div>
              {errors[card.id] && (
                <p role="alert" className="text-sm text-red-700">
                  {errors[card.id]}
                </p>
              )}
              <div className="mt-auto">
                <Button type="button" onClick={() => respond(card)} disabled={busy === card.id}>
                  {busy === card.id ? "Comprobando…" : state ? "Responder de nuevo" : "Responder"}
                </Button>
              </div>
            </section>
          );
        })}
      </div>

      <dialog
        ref={dialogRef}
        onClose={() => setResult(null)}
        aria-labelledby="ficha-resultado"
        className="m-auto w-[min(92vw,34rem)] rounded-2xl border-2 border-zinc-200 bg-white p-0 text-left shadow-2xl backdrop:bg-black/50"
      >
        {result && (
          <div className="flex flex-col gap-4 p-6">
            <div
              className={`flex items-center gap-3 rounded-lg border-l-4 px-4 py-3 ${
                result.correct ? "border-green-700 bg-green-50 text-green-950" : "border-amber-600 bg-amber-50 text-amber-950"
              }`}
            >
              {result.correct && <IconCheck width={22} height={22} strokeWidth={2.4} aria-hidden />}
              <h2 id="ficha-resultado" className="text-xl font-semibold">
                {result.correct ? "¡Bien hecho!" : "Revisemos esta respuesta"}
              </h2>
            </div>
            <p className="text-sm font-medium text-zinc-600">{result.question}</p>
            {!result.correct && result.correctTexts.length > 0 && (
              <p className="text-sm text-navy">
                <span className="font-semibold">{result.correctTexts.length > 1 ? "Las respuestas correctas son: " : "La respuesta correcta es: "}</span>
                {result.correctTexts.join("; ")}
              </p>
            )}
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Retroalimentación</p>
              <p className="whitespace-pre-wrap break-words leading-relaxed text-zinc-800">{result.feedback}</p>
            </div>
            <div className="flex justify-end">
              <Button type="button" variant="dark" autoFocus onClick={() => dialogRef.current?.close()}>
                {result.correct ? "Continuar" : "Entendido"}
              </Button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
