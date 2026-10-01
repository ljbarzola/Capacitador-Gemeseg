"use client";

import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { Field, FormMessage, SubmitButton } from "@/components/auth-ui";
import { authErrorMessage, getClientAuth } from "@/lib/firebase/client";

export function RecuperarForm() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email")).trim();
    setPending(true);
    setError(null);
    try {
      await sendPasswordResetEmail(getClientAuth(), email);
      setSent(true);
    } catch (e) {
      // Por privacidad no se revela si el correo existe.
      const code = (e as { code?: string }).code;
      if (code === "auth/user-not-found") setSent(true);
      else setError(authErrorMessage(e));
    }
    setPending(false);
  }

  if (sent) {
    return (
      <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-900">
        Si el correo está registrado, le enviamos un enlace para crear una contraseña nueva.
        Revise también la carpeta de spam.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <Field label="Correo electrónico" name="email" type="email" autoComplete="email" required />
      {error && <FormMessage>{error}</FormMessage>}
      <SubmitButton pending={pending}>Enviar enlace</SubmitButton>
    </form>
  );
}
