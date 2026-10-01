import Image from "next/image";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

// Piezas visuales compartidas por login, registro y recuperación.

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-10">
      <Link href="/" aria-label="Inicio">
        <Image
          src="/brand/logo-gemeseg-bgwhite.png"
          alt="Gemeseg Seguridad"
          width={2765}
          height={561}
          className="h-auto w-56"
          priority
        />
      </Link>
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-xl font-semibold text-navy">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-zinc-600">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
      {footer && <p className="text-sm text-zinc-600">{footer}</p>}
    </main>
  );
}

export function Field({
  label,
  error,
  hint,
  ...input
}: { label: string; error?: string; hint?: string } & ComponentProps<"input">) {
  const id = input.id ?? input.name;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-navy">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="rounded-lg border border-zinc-300 px-3 py-2 text-base text-navy outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30 aria-invalid:border-red-600"
        {...input}
      />
      {hint && !error && <span className="text-xs text-zinc-500">{hint}</span>}
      {error && (
        <span id={`${id}-error`} role="alert" className="text-xs text-red-700">
          {error}
        </span>
      )}
    </div>
  );
}

export function SubmitButton({
  pending,
  children,
}: {
  pending: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand px-4 py-2.5 font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
    >
      {pending ? "Un momento…" : children}
    </button>
  );
}

export function FormMessage({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
      {children}
    </p>
  );
}
