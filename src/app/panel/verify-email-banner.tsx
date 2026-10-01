"use client";

import { useState } from "react";
import { onAuthStateChanged, sendEmailVerification } from "firebase/auth";
import { getClientAuth } from "@/lib/firebase/client";

// Aviso para quien aún no verificó su correo, con opción de reenviar el enlace.
export function VerifyEmailBanner() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  function resend() {
    setStatus("sending");
    const auth = getClientAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      try {
        if (!user) throw new Error("sin sesión");
        await sendEmailVerification(user);
        setStatus("sent");
      } catch {
        setStatus("error");
      }
    });
  }

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <p>
        Falta verificar su correo. Le enviamos un enlace cuando se registró; revise su bandeja
        de entrada y el spam.
      </p>
      <button
        type="button"
        onClick={resend}
        disabled={status === "sending" || status === "sent"}
        className="mt-2 font-semibold underline disabled:opacity-60"
      >
        {status === "sent"
          ? "Enlace enviado"
          : status === "sending"
            ? "Enviando…"
            : "Reenviar enlace"}
      </button>
      {status === "error" && (
        <span className="ml-2 text-red-800">No se pudo enviar. Intente de nuevo.</span>
      )}
    </div>
  );
}
