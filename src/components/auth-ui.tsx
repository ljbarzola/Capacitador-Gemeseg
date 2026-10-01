import Image from "next/image";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

// Marco de las pantallas de acceso: panel de marca (escritorio) + formulario.

export function BrandPanel({ compact = false }: { compact?: boolean }) {
  return (
    <aside className="flex flex-col justify-between bg-navy px-6 py-5 text-white lg:min-h-screen lg:w-[42%] lg:px-14 lg:py-14">
      <Link href="/" aria-label="Inicio" className="inline-block self-start">
        <Image
          src="/brand/logo-gemeseg-bgblue.png"
          alt="Gemeseg Seguridad"
          width={2765}
          height={562}
          className="h-auto w-32 lg:w-44"
          priority
        />
      </Link>
      {!compact && (
        <div className="hidden lg:block">
          <div className="mb-6 h-1 w-12 bg-brand" aria-hidden />
          <p className="max-w-sm text-[2.6rem] font-semibold leading-[1.05]" style={{ fontStretch: "86%" }}>
            Capacitación para el personal de seguridad
          </p>
          <p className="mt-5 max-w-sm text-[0.95rem] leading-relaxed text-white/70">
            Cursos, evaluaciones y certificados en un solo lugar, desde su celular o su computador.
          </p>
        </div>
      )}
      <p className="hidden text-xs text-white/45 lg:block">Gemeseg Seguridad · Ecuador</p>
    </aside>
  );
}

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
    <div className="flex flex-1 flex-col lg:flex-row">
      <BrandPanel />
      <main className="flex flex-1 flex-col items-center justify-center gap-5 px-5 py-10 sm:py-14">
        <div className="w-full max-w-md">
          <h1 className="text-3xl text-navy">{title}</h1>
          {subtitle && <p className="mt-2 text-[0.95rem] text-zinc-600">{subtitle}</p>}
          <div className="mt-7">{children}</div>
          {footer && <p className="mt-7 text-sm text-zinc-600">{footer}</p>}
        </div>
      </main>
    </div>
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
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-navy">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-base text-navy outline-none transition-colors hover:border-zinc-400 focus:border-navy focus:ring-2 focus:ring-navy/15 aria-invalid:border-red-600"
        {...input}
      />
      {hint && !error && <span className="text-xs text-zinc-500">{hint}</span>}
      {error && (
        <span id={`${id}-error`} role="alert" className="text-xs font-medium text-red-700">
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
      className="min-h-11 rounded-md bg-brand px-4 py-2.5 font-semibold text-white transition-colors hover:bg-[#d6341a] disabled:opacity-60"
    >
      {pending ? "Un momento…" : children}
    </button>
  );
}

export function FormMessage({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-md border-l-4 border-red-600 bg-red-50 px-3 py-2 text-sm text-red-900">
      {children}
    </p>
  );
}
