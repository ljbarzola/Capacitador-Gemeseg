import "server-only";
import { cache } from "react";
import type { FieldType } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";

// Campos adicionales de registro (cargo, sede, empresa…). Los define el administrador y sus
// respuestas se guardan en User.extraFields con la clave de cada campo.

export type FieldDef = {
  id: string;
  key: string;
  label: string;
  type: FieldType;
  options: string[];
  required: boolean;
};

export const getActiveFields = cache(async (): Promise<FieldDef[]> => {
  return getPrisma().registrationField.findMany({
    where: { active: true },
    orderBy: [{ order: "asc" }, { id: "asc" }],
    select: { id: true, key: true, label: true, type: true, options: true, required: true },
  });
});

// Clave estable a partir de la etiqueta: "Cargo / Puesto" → "cargo_puesto".
export function slugKey(label: string) {
  return (
    label
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "campo"
  );
}

export function parseOptions(raw: string) {
  const seen = new Set<string>();
  return raw
    .split(/\r?\n|;/)
    .map((o) => o.trim().slice(0, 80))
    .filter((o) => o && !seen.has(o.toLowerCase()) && seen.add(o.toLowerCase()))
    .slice(0, 40);
}

// Valida las respuestas contra los campos activos. Devuelve los valores limpios y los errores por clave.
export function validateExtra(fields: FieldDef[], raw: Record<string, unknown> | null | undefined) {
  const values: Record<string, string> = {};
  const errors: Record<string, string> = {};
  for (const field of fields) {
    const value = typeof raw?.[field.key] === "string" ? (raw[field.key] as string).trim().slice(0, 200) : "";
    if (!value) {
      if (field.required) errors[field.key] = `${field.label}: este dato es obligatorio`;
      continue;
    }
    if (field.type === "SELECT" && !field.options.includes(value)) {
      errors[field.key] = `${field.label}: elija una opción de la lista`;
      continue;
    }
    values[field.key] = value;
  }
  return { values, errors };
}
