import { flashText } from "@/lib/flash";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

// Identidad de color: el naranja de marca es la acción; cada curso y cada indicador usa un acento
// secundario sobrio (siempre los mismos, para que la persona reconozca "su" curso a simple vista).
export const ACCENTS = [
  { name: "naranja", bar: "bg-[#e8431f]", soft: "bg-[#fdeae6]", text: "text-[#a8290f]", border: "border-[#f3c2b6]", edge: "border-t-[#e8431f]" },
  { name: "turquesa", bar: "bg-teal-600", soft: "bg-teal-50", text: "text-teal-800", border: "border-teal-200", edge: "border-t-teal-600" },
  { name: "indigo", bar: "bg-indigo-600", soft: "bg-indigo-50", text: "text-indigo-800", border: "border-indigo-200", edge: "border-t-indigo-600" },
  { name: "ambar", bar: "bg-amber-600", soft: "bg-amber-50", text: "text-amber-800", border: "border-amber-200", edge: "border-t-amber-600" },
  { name: "esmeralda", bar: "bg-emerald-600", soft: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200", edge: "border-t-emerald-600" },
] as const;

export type Accent = (typeof ACCENTS)[number];

// Acento estable para un texto (p. ej. el id de un curso).
export function accentFor(key: string): Accent {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return ACCENTS[hash % ACCENTS.length];
}

// Piezas visuales comunes de la zona autenticada: paneles planos con borde fino, esquinas
// sobrias y un solo color de acción (naranja).

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
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-[1.7rem] leading-tight text-navy sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-prose text-[0.95rem] text-zinc-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
  children,
  className = "",
  interactive = false,
  accent,
  style,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  accent?: Accent;
  style?: React.CSSProperties;
}) {
  return (
    <section
      style={style}
      className={`rounded-lg border border-zinc-200 bg-white p-5 ${accent ? `border-t-[3px] ${accent.edge}` : ""} ${
        interactive
          ? "transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-[0_8px_24px_-12px_rgba(16,15,49,0.25)]"
          : ""
      } ${className}`}
    >
      {children}
    </section>
  );
}

// Cuadro de color con un icono, para identificar secciones e indicadores.
export function IconChip({ children, accent, size = "md" }: { children: ReactNode; accent: Accent; size?: "md" | "lg" }) {
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-lg ${accent.soft} ${accent.text} ${
        size === "lg" ? "size-11 [&>svg]:size-6" : "size-9 [&>svg]:size-[18px]"
      }`}
    >
      {children}
    </span>
  );
}

const button = {
  primary: "bg-[#d6341a] text-white hover:bg-[#bd2d16] active:bg-[#a52712]",
  secondary: "border border-zinc-300 bg-white text-navy hover:border-zinc-400 hover:bg-zinc-50",
  danger: "border border-red-200 bg-white text-red-700 hover:border-red-300 hover:bg-red-50",
  ghost: "text-navy hover:bg-zinc-100",
  dark: "bg-navy text-white hover:bg-[#1d1b4b]",
} as const;

type Variant = keyof typeof button;

const base =
  "inline-flex min-h-9 items-center justify-center gap-2 rounded-md px-3.5 py-1.5 text-sm font-semibold transition-[colors,transform] duration-150 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55";

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

const control =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-navy outline-none transition-colors placeholder:text-zinc-400 hover:border-zinc-400 focus:border-navy focus:ring-2 focus:ring-navy/15 disabled:bg-zinc-50 disabled:text-zinc-500";

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input className={`${control} ${className}`} {...props} />;
}

export function Textarea({ className = "", ...props }: ComponentProps<"textarea">) {
  return <textarea className={`${control} ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return <select className={`${control} ${className}`} {...props} />;
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
    <label className={`flex flex-col gap-1.5 text-sm font-medium text-navy ${className}`}>
      <span>{label}</span>
      {children}
      {hint && <span className="text-xs font-normal leading-snug text-zinc-500">{hint}</span>}
    </label>
  );
}

// Barra continua (porcentaje).
export function ProgressBar({ percent, fill = "bg-brand" }: { percent: number; fill?: string }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200"
    >
      <div className={`h-full rounded-full ${fill} transition-all duration-700`} style={{ width: `${percent}%` }} />
    </div>
  );
}

// Un segmento por actividad del curso; si son muchas, cae a barra continua.
export function SegmentProgress({
  completed,
  total,
  className = "",
  accent,
}: {
  completed: number;
  total: number;
  className?: string;
  accent?: Accent;
}) {
  const fill = accent?.bar ?? "bg-brand";
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  if (total === 0 || total > 36) {
    return (
      <div className={className}>
        <ProgressBar percent={percent} fill={fill} />
      </div>
    );
  }
  return (
    <div
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${completed} de ${total} actividades completadas`}
      className={`flex gap-[3px] ${className}`}
    >
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className="relative h-1.5 flex-1 overflow-hidden rounded-[2px] bg-zinc-200">
          {i < completed && <span className={`grow absolute inset-0 ${fill}`} style={{ "--i": i } as React.CSSProperties} />}
        </span>
      ))}
    </div>
  );
}

const badgeTone = {
  gray: "bg-zinc-100 text-zinc-700",
  green: "bg-[#e3f2ea] text-[#14603f]",
  amber: "bg-[#fbefd6] text-[#7d4b00]",
  blue: "bg-[#e5ecf9] text-[#1c4797]",
  red: "bg-[#fbe6e3] text-[#9a2118]",
  teal: "bg-teal-50 text-teal-800",
  indigo: "bg-indigo-50 text-indigo-800",
} as const;

export function Badge({
  tone = "gray",
  children,
}: {
  tone?: keyof typeof badgeTone;
  children: ReactNode;
}) {
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${badgeTone[tone]}`}>
      {children}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-6 py-10 text-center text-sm text-zinc-600">
      {children}
    </div>
  );
}

// Indicador de los paneles de resumen: cifra grande, rótulo, icono en color y una pista de contexto.
export function Stat({
  label,
  value,
  note,
  accent,
  icon,
  className = "",
  style,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  accent?: Accent;
  icon?: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      className={`flex items-start gap-3.5 rounded-lg border border-zinc-200 bg-white px-5 py-4 ${accent ? `border-t-[3px] ${accent.edge}` : ""} ${className}`}
    >
      {icon && accent && <IconChip accent={accent}>{icon}</IconChip>}
      <div className="min-w-0">
        <p className="text-sm text-zinc-600">{label}</p>
        <p className="mt-1 text-3xl font-semibold leading-none text-navy" style={{ fontStretch: "88%" }}>
          {value}
        </p>
        {note && <p className="mt-2 text-xs text-zinc-500">{note}</p>}
      </div>
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
      className={`mb-5 rounded-md border-l-4 px-4 py-3 text-sm ${
        errorText ? "border-red-600 bg-red-50 text-red-900" : "border-green-700 bg-green-50 text-green-900"
      }`}
    >
      {errorText ?? okText}
    </p>
  );
}

// Tablas de datos: encabezado discreto, filas con separador fino, desplazables en móvil.
export function TableWrap({ children, minWidth = 640 }: { children: ReactNode; minWidth?: number }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
      <table className="w-full border-collapse text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function Th({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={`border-b border-zinc-200 bg-zinc-50 px-4 py-2.5 text-left text-xs font-semibold text-zinc-600 ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <td className={`border-b border-zinc-100 px-4 py-3 align-middle text-navy ${className}`}>{children}</td>;
}
