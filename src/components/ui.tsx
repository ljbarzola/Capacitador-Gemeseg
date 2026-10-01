import { flashText } from "@/lib/flash";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

// Piezas visuales comunes de la zona autenticada.

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-navy">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-zinc-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm ${className}`}>
      {children}
    </section>
  );
}

const button = {
  primary: "bg-brand text-white hover:brightness-95",
  secondary: "border border-zinc-300 bg-white text-navy hover:bg-zinc-50",
  danger: "border border-red-300 bg-white text-red-700 hover:bg-red-50",
  ghost: "text-navy hover:bg-zinc-100",
} as const;

type Variant = keyof typeof button;

const base =
  "inline-flex items-center justify-center rounded-lg px-3.5 py-2 text-sm font-semibold transition disabled:opacity-60";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: { variant?: Variant } & ComponentProps<"button">) {
  return <button className={`${base} ${button[variant]} ${className}`} {...props} />;
}

export function LinkButton({
  variant = "primary",
  className = "",
  ...props
}: { variant?: Variant } & ComponentProps<typeof Link>) {
  return <Link className={`${base} ${button[variant]} ${className}`} {...props} />;
}

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return (
    <input
      className={`w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-navy outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 ${className}`}
      {...props}
    />
  );
}

export function Textarea({ className = "", ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={`w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-navy outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 ${className}`}
      {...props}
    />
  );
}

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return (
    <select
      className={`w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-navy outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 ${className}`}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 text-sm font-medium text-navy ${className}`}>
      <span>{label}</span>
      {children}
      {hint && <span className="text-xs font-normal text-zinc-500">{hint}</span>}
    </label>
  );
}

export function ProgressBar({ percent }: { percent: number }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-2 w-full overflow-hidden rounded-full bg-zinc-200"
    >
      <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${percent}%` }} />
    </div>
  );
}

const badgeTone = {
  gray: "bg-zinc-100 text-zinc-700",
  green: "bg-green-100 text-green-800",
  amber: "bg-amber-100 text-amber-900",
  blue: "bg-blue-100 text-blue-800",
  red: "bg-red-100 text-red-800",
} as const;

export function Badge({
  tone = "gray",
  children,
}: {
  tone?: keyof typeof badgeTone;
  children: ReactNode;
}) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeTone[tone]}`}>
      {children}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-600">
      {children}
    </div>
  );
}

// Mensaje de resultado (éxito o error) a partir de los códigos de la URL.
export function Flash({
  ok,
  error,
  n,
}: {
  ok?: string | string[];
  error?: string | string[];
  n?: string | string[];
}) {
  const pick = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);
  const okText = flashText(pick(ok), pick(n));
  const errorText = flashText(pick(error));
  if (!okText && !errorText) return null;
  return (
    <p
      role={errorText ? "alert" : "status"}
      className={`mb-4 rounded-xl px-4 py-3 text-sm ${
        errorText ? "bg-red-50 text-red-800" : "bg-green-50 text-green-900"
      }`}
    >
      {errorText ?? okText}
    </p>
  );
}
