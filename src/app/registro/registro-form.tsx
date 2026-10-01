"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import * as z from "zod";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Field, FormMessage, SubmitButton } from "@/components/auth-ui";
import { authErrorMessage, getClientAuth } from "@/lib/firebase/client";
import { registerSchema, type FieldErrors } from "@/lib/validation/auth";

export function RegistroForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<FieldErrors & { confirm?: string[] }>({});
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values = {
      firstNames: String(form.get("firstNames") ?? ""),
      lastNames: String(form.get("lastNames") ?? ""),
      cedula: String(form.get("cedula") ?? ""),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    };

    // Aviso rápido en el navegador; el servidor vuelve a validar todo.
    const check = registerSchema.safeParse(values);
    const fieldErrors: FieldErrors & { confirm?: string[] } = check.success
      ? {}
      : (z.flattenError(check.error).fieldErrors as FieldErrors);
    if (values.password !== String(form.get("confirm") ?? "")) {
      fieldErrors.confirm = ["Las contraseñas no coinciden"];
    }
    setErrors(fieldErrors);
    setMessage(null);
    if (Object.keys(fieldErrors).length > 0) return;

    setPending(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        if (data?.errors) setErrors(data.errors);
        else setMessage(data?.message ?? "No se pudo crear la cuenta.");
        setPending(false);
        return;
      }

      const auth = getClientAuth();
      const credential = await signInWithEmailAndPassword(
        auth,
        check.success ? check.data.email : values.email,
        values.password,
      );
      const session = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: await credential.user.getIdToken() }),
      });
      if (!session.ok) {
        // La cuenta ya existe: solo falta ingresar.
        router.push("/login");
        return;
      }
      router.push("/panel");
      router.refresh();
    } catch (e) {
      setMessage(authErrorMessage(e));
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Nombres"
          name="firstNames"
          autoComplete="given-name"
          error={errors.firstNames?.[0]}
          required
        />
        <Field
          label="Apellidos"
          name="lastNames"
          autoComplete="family-name"
          error={errors.lastNames?.[0]}
          required
        />
      </div>
      <Field
        label="Cédula de identidad"
        name="cedula"
        maxLength={20}
        hint="Aparecerá en su certificado."
        error={errors.cedula?.[0]}
        required
      />
      <Field
        label="Correo electrónico"
        name="email"
        type="email"
        autoComplete="email"
        error={errors.email?.[0]}
        required
      />
      <Field
        label="Contraseña"
        name="password"
        type="password"
        autoComplete="new-password"
        hint="Mínimo 8 caracteres, con letras y números."
        error={errors.password?.[0]}
        required
      />
      <Field
        label="Repetir contraseña"
        name="confirm"
        type="password"
        autoComplete="new-password"
        error={errors.confirm?.[0]}
        required
      />
      {message && <FormMessage>{message}</FormMessage>}
      <SubmitButton pending={pending}>Crear cuenta</SubmitButton>
    </form>
  );
}
