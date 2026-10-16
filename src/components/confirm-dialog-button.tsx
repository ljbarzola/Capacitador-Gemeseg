"use client";

import { type ReactNode, useRef } from "react";
import { Button } from "@/components/ui";

// Botón destructivo que pide confirmación en una ventana propia de la app (no usa window.confirm).
// Va dentro del <form> de la acción: «Confirmar» envía el formulario.
export function ConfirmDialogButton({
  children,
  title,
  message,
  confirmLabel = "Eliminar",
}: {
  children: ReactNode;
  title: string;
  message: string;
  confirmLabel?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <Button type="button" variant="danger" onClick={() => ref.current?.showModal()}>
        {children}
      </Button>
      <dialog
        ref={ref}
        aria-label={title}
        className="m-auto w-[min(92vw,26rem)] rounded-2xl border-2 border-zinc-200 bg-white p-0 text-left shadow-2xl backdrop:bg-black/50"
      >
        <div className="flex flex-col gap-4 p-6">
          <h2 className="text-lg font-semibold text-navy">{title}</h2>
          <p className="text-sm leading-relaxed text-zinc-700">{message}</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" autoFocus onClick={() => ref.current?.close()}>
              Cancelar
            </Button>
            <Button type="submit" variant="dark">
              {confirmLabel}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
