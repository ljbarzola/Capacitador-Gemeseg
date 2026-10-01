"use client";

import { useState } from "react";
import { EmailAuthProvider, onAuthStateChanged, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { Button, Field, Input } from "@/components/ui";
import { getClientAuth } from "@/lib/firebase/client";

function waitForUser() {
  const auth = getClientAuth();
  return new Promise<NonNullable<typeof auth.currentUser>>((resolve, reject) => {
    const off = onAuthStateChanged(auth, (user) => {
      off();
      if (user) resolve(user);
      else reject(new Error("sin sesión"));
    });
  });
}

export function PasswordForm() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const current = String(data.get("current") ?? "");
    const next = String(data.get("next") ?? "");
    const confirm = String(data.get("confirm") ?? "");

    if (next.length < 8 || !/[a-zA-Z]/.test(next) || !/[0-9]/.test(next)) {
      setMessage({ ok: false, text: "La contraseña nueva debe tener al menos 8 caracteres, con letras y números." });
      return;
    }
    if (next !== confirm) {
      setMessage({ ok: false, text: "Las contraseñas nuevas no coinciden." });
      return;
    }

    setPending(true);
    setMessage(null);
    try {
      const user = await waitForUser();
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email ?? "", current));
      await updatePassword(user, next);
      await fetch("/api/auth/password-changed", { method: "POST" });
      form.reset();
      setMessage({ ok: true, text: "Su contraseña se cambió correctamente." });
    } catch (error) {
      const code = (error as { code?: string }).code ?? "";
      setMessage({
        ok: false,
        text:
          code === "auth/invalid-credential" || code === "auth/wrong-password"
            ? "La contraseña actual no es correcta."
            : code === "auth/too-many-requests"
              ? "Demasiados intentos. Espere unos minutos e intente de nuevo."
              : "No se pudo cambiar la contraseña. Vuelva a ingresar e inténtelo de nuevo.",
      });
    }
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-md gap-4">
      <Field label="Contraseña actual">
        <Input name="current" type="password" autoComplete="current-password" required />
      </Field>
      <Field label="Contraseña nueva" hint="Mínimo 8 caracteres, con letras y números.">
        <Input name="next" type="password" autoComplete="new-password" required />
      </Field>
      <Field label="Repetir contraseña nueva">
        <Input name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      {message && (
        <p
          role={message.ok ? "status" : "alert"}
          className={`rounded-md border-l-4 px-3 py-2 text-sm ${
            message.ok ? "border-green-700 bg-green-50 text-green-900" : "border-red-600 bg-red-50 text-red-900"
          }`}
        >
          {message.text}
        </p>
      )}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Cambiando…" : "Cambiar contraseña"}
        </Button>
      </div>
    </form>
  );
}
