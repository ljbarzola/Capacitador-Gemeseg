"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Field, FormMessage, SubmitButton } from "@/components/auth-ui";
import { authErrorMessage, getClientAuth } from "@/lib/firebase/client";

export function LoginForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      const credential = await signInWithEmailAndPassword(
        getClientAuth(),
        String(form.get("email")).trim(),
        String(form.get("password")),
      );
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: await credential.user.getIdToken() }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message ?? "No se pudo iniciar la sesión.");
      }
      router.push("/panel");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error && !("code" in e) ? e.message : authErrorMessage(e));
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <Field label="Correo electrónico" name="email" type="email" autoComplete="email" required />
      <Field
        label="Contraseña"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      {error && <FormMessage>{error}</FormMessage>}
      <SubmitButton pending={pending}>Ingresar</SubmitButton>
      <Link href="/recuperar" className="text-center text-sm text-zinc-600 underline">
        ¿Olvidó su contraseña?
      </Link>
    </form>
  );
}
