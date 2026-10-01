"use client";

import { useActionState, useState } from "react";
import { IconCheck } from "@/components/icons";
import { Button, Textarea } from "@/components/ui";
import { submitFeedback, type FeedbackState } from "./actions";

const MAX = 3000;

// Comentarios finales del curso: muestra "Enviando…", y la confirmación aparece junto al botón.
export function FeedbackForm({ courseId, initial }: { courseId: string; initial: string }) {
  const [state, action, pending] = useActionState<FeedbackState, FormData>(submitFeedback, { status: "idle", message: "" });
  const [text, setText] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const dirty = text.trim() !== saved.trim();

  return (
    <form
      action={(formData) => {
        setSaved(text);
        return action(formData);
      }}
      className="mt-4 flex flex-col gap-3"
    >
      <input type="hidden" name="courseId" value={courseId} />
      <Textarea
        name="comment"
        rows={4}
        maxLength={MAX}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Escriba aquí lo que le pareció útil y lo que mejoraría."
        aria-label="Comentarios sobre el curso"
        required
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="secondary" disabled={pending || !text.trim() || (state.status === "ok" && !dirty)}>
          {pending ? "Enviando…" : saved.trim() || state.status === "ok" ? "Actualizar comentarios" : "Enviar comentarios"}
        </Button>
        <span className="text-xs text-zinc-500">
          {text.length} / {MAX}
        </span>
        <p
          role={state.status === "error" ? "alert" : "status"}
          aria-live="polite"
          className={`inline-flex items-center gap-1.5 text-sm font-medium ${state.status === "error" ? "text-red-700" : "text-green-800"}`}
        >
          {state.status === "ok" && !dirty && <IconCheck width={16} height={16} strokeWidth={2.2} />}
          {state.status === "ok" && !dirty ? state.message : state.status === "error" ? state.message : ""}
        </p>
      </div>
    </form>
  );
}
