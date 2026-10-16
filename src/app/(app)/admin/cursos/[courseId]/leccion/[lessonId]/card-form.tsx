"use client";

import { useState } from "react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { saveCard } from "../../../actions";

type QType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE";
type Opt = { text: string; correct: boolean };

const TRUE_FALSE: Opt[] = [
  { text: "Verdadero", correct: true },
  { text: "Falso", correct: false },
];

// Formulario de una ficha: pregunta, opciones (con la correcta marcada) y la retroalimentación
// que verá la persona al responder, acierte o no.
export function CardForm({
  courseId,
  lessonId,
  card,
}: {
  courseId: string;
  lessonId: string;
  card?: { id: string; type: QType; text: string; feedback: string; options: Opt[] };
}) {
  const [type, setType] = useState<QType>(card?.type ?? "SINGLE_CHOICE");
  const [options, setOptions] = useState<Opt[]>(
    card?.options ?? [
      { text: "", correct: true },
      { text: "", correct: false },
    ],
  );

  function changeType(next: QType) {
    setType(next);
    if (next === "TRUE_FALSE") {
      setOptions(TRUE_FALSE.map((o) => ({ ...o })));
    } else if (type === "TRUE_FALSE") {
      setOptions([
        { text: "", correct: true },
        { text: "", correct: false },
      ]);
    } else if (next === "SINGLE_CHOICE") {
      // En opción única solo puede haber una correcta.
      const firstCorrect = options.findIndex((o) => o.correct);
      setOptions(options.map((o, i) => ({ ...o, correct: i === Math.max(firstCorrect, 0) })));
    }
  }

  function setCorrect(index: number, checked: boolean) {
    setOptions(
      options.map((o, i) =>
        type === "MULTIPLE_CHOICE" ? (i === index ? { ...o, correct: checked } : o) : { ...o, correct: i === index },
      ),
    );
  }

  const fixed = type === "TRUE_FALSE";
  const group = `correct-ficha-${card?.id ?? "nueva"}`;

  return (
    <form action={saveCard} className="grid gap-4">
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="lessonId" value={lessonId} />
      {card && <input type="hidden" name="cardId" value={card.id} />}
      <input type="hidden" name="options" value={JSON.stringify(options)} />

      <Field label="Tipo de pregunta">
        <Select name="type" value={type} onChange={(event) => changeType(event.target.value as QType)}>
          <option value="SINGLE_CHOICE">Opción única</option>
          <option value="MULTIPLE_CHOICE">Selección múltiple</option>
          <option value="TRUE_FALSE">Verdadero o falso</option>
        </Select>
      </Field>

      <Field label="Pregunta de la ficha">
        <Textarea name="text" defaultValue={card?.text} required rows={2} maxLength={1000} />
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium text-navy">
          Opciones{" "}
          <span className="font-normal text-zinc-500">
            (marque {type === "MULTIPLE_CHOICE" ? "todas las correctas" : "la correcta"})
          </span>
        </legend>
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type={type === "MULTIPLE_CHOICE" ? "checkbox" : "radio"}
              name={group}
              checked={option.correct}
              onChange={(event) => setCorrect(index, event.target.checked)}
              aria-label={`Opción ${index + 1} correcta`}
              className="size-4 shrink-0 accent-[#ee3b1b]"
            />
            <Input
              value={option.text}
              onChange={(event) => setOptions(options.map((o, i) => (i === index ? { ...o, text: event.target.value } : o)))}
              readOnly={fixed}
              required
              maxLength={500}
              placeholder={`Opción ${index + 1}`}
              aria-label={`Texto de la opción ${index + 1}`}
            />
            {!fixed && options.length > 2 && (
              <Button
                type="button"
                variant="ghost"
                className="px-2"
                aria-label={`Quitar opción ${index + 1}`}
                onClick={() => {
                  const next = options.filter((_, i) => i !== index);
                  if (!next.some((o) => o.correct)) next[0] = { ...next[0], correct: true };
                  setOptions(next);
                }}
              >
                ✕
              </Button>
            )}
          </div>
        ))}
        {!fixed && options.length < 8 && (
          <div>
            <Button type="button" variant="secondary" onClick={() => setOptions([...options, { text: "", correct: false }])}>
              + Agregar opción
            </Button>
          </div>
        )}
      </fieldset>

      <Field
        label="Retroalimentación"
        hint="Se muestra siempre al responder, acierte o no: explique el concepto y por qué esa es la respuesta correcta."
      >
        <Textarea name="feedback" defaultValue={card?.feedback} required rows={4} maxLength={2000} />
      </Field>

      <div>
        <Button type="submit">{card ? "Guardar ficha" : "Agregar ficha"}</Button>
      </div>
    </form>
  );
}
