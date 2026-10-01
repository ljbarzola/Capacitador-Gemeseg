import "server-only";
import { randomInt } from "node:crypto";
import * as z from "zod";
import { normalizeHeader, parseCsv } from "@/lib/csv";
import { getPrisma } from "@/lib/prisma";
import { getActiveFields, validateExtra } from "@/lib/registration-fields";

// Importación de usuarios desde CSV. Se analiza primero (vista previa) y solo después se crea,
// volviendo a validar todo en el servidor.

export const MAX_IMPORT_ROWS = 500;

export type ImportRow = {
  line: number; // número de línea en el archivo (la 1 es el encabezado)
  cedula: string;
  firstNames: string;
  lastNames: string;
  email: string;
  group: string | null;
  extra: Record<string, string>;
  errors: string[];
  notes: string[];
};

export type Analysis = {
  fatal?: string;
  rows: ImportRow[];
  valid: number;
  invalid: number;
  newGroups: string[];
};

const ALIASES = {
  cedula: ["cedula", "documento", "identificacion", "ci", "cedulaidentidad"],
  firstNames: ["nombres", "nombre", "primernombre"],
  lastNames: ["apellidos", "apellido"],
  email: ["correo", "email", "correoelectronico", "mail"],
  group: ["grupo"],
} as const;

const nameSchema = z.string().trim().min(2).max(80);
const emailSchema = z.string().trim().toLowerCase().pipe(z.email());

export async function analyzeCsv(text: string): Promise<Analysis> {
  const empty = { rows: [], valid: 0, invalid: 0, newGroups: [] };
  const table = parseCsv(text);
  if (table.length < 2) return { ...empty, fatal: "El archivo no tiene filas de datos. Use la plantilla y deje la primera fila con los encabezados." };
  if (table.length - 1 > MAX_IMPORT_ROWS) {
    return { ...empty, fatal: `El archivo tiene más de ${MAX_IMPORT_ROWS} filas. Divídalo en varios archivos.` };
  }

  const fields = await getActiveFields();
  const headers = table[0].map(normalizeHeader);
  const indexOf = (names: readonly string[]) => headers.findIndex((h) => names.includes(h));
  const col = {
    cedula: indexOf(ALIASES.cedula),
    firstNames: indexOf(ALIASES.firstNames),
    lastNames: indexOf(ALIASES.lastNames),
    email: indexOf(ALIASES.email),
    group: indexOf(ALIASES.group),
  };
  const missing = (
    [
      ["cedula", "cédula"],
      ["firstNames", "nombres"],
      ["lastNames", "apellidos"],
      ["email", "correo"],
    ] as const
  )
    .filter(([key]) => col[key] < 0)
    .map(([, label]) => label);
  if (missing.length) {
    return { ...empty, fatal: `Faltan columnas obligatorias en el encabezado: ${missing.join(", ")}.` };
  }
  const extraCols = fields
    .map((f) => ({ field: f, index: headers.findIndex((h) => h === normalizeHeader(f.key) || h === normalizeHeader(f.label)) }))
    .filter((c) => c.index >= 0);

  const rows: ImportRow[] = table.slice(1).map((cells, i) => {
    const get = (index: number) => (index >= 0 ? (cells[index] ?? "").trim() : "");
    const row: ImportRow = {
      line: i + 2,
      cedula: get(col.cedula).replace(/[\s-]/g, ""),
      firstNames: get(col.firstNames).replace(/\s+/g, " "),
      lastNames: get(col.lastNames).replace(/\s+/g, " "),
      email: get(col.email).toLowerCase(),
      group: get(col.group) || null,
      extra: {},
      errors: [],
      notes: [],
    };
    // Excel suele quitar el cero inicial de las cédulas que empiezan en 0.
    if (/^\d{9}$/.test(row.cedula)) {
      row.cedula = `0${row.cedula}`;
      row.notes.push("Se agregó el cero inicial a la cédula");
    }
    if (!/^\d{10}$/.test(row.cedula)) row.errors.push("La cédula debe tener exactamente 10 números");
    if (!nameSchema.safeParse(row.firstNames).success) row.errors.push("Nombres: de 2 a 80 caracteres");
    if (!nameSchema.safeParse(row.lastNames).success) row.errors.push("Apellidos: de 2 a 80 caracteres");
    if (!emailSchema.safeParse(row.email).success) row.errors.push("Correo no válido");

    const rawExtra: Record<string, unknown> = {};
    for (const c of extraCols) rawExtra[c.field.key] = cells[c.index] ?? "";
    const { values, errors } = validateExtra(fields, rawExtra);
    row.extra = values;
    // Los campos obligatorios que no vienen en el archivo no impiden crear la cuenta:
    // la persona los completa luego en su perfil.
    for (const [key, message] of Object.entries(errors)) {
      if (extraCols.some((c) => c.field.key === key)) row.errors.push(message);
    }
    return row;
  });

  // Repetidos dentro del archivo
  for (const key of ["cedula", "email"] as const) {
    const seen = new Map<string, number>();
    for (const row of rows) {
      const value = row[key];
      if (!value) continue;
      if (seen.has(value)) row.errors.push(`${key === "cedula" ? "Cédula" : "Correo"} repetido en la línea ${seen.get(value)}`);
      else seen.set(value, row.line);
    }
  }

  // Ya registrados en la plataforma
  const prisma = getPrisma();
  const existing = await prisma.user.findMany({
    where: { OR: [{ cedula: { in: rows.map((r) => r.cedula) } }, { email: { in: rows.map((r) => r.email) } }] },
    select: { cedula: true, email: true },
  });
  const cedulas = new Set(existing.map((u) => u.cedula));
  const emails = new Set(existing.map((u) => u.email));
  for (const row of rows) {
    if (cedulas.has(row.cedula)) row.errors.push("Esta cédula ya está registrada");
    if (emails.has(row.email)) row.errors.push("Este correo ya está registrado");
  }

  const groups = await prisma.group.findMany({ select: { name: true } });
  const known = new Set(groups.map((g) => g.name.toLowerCase()));
  const newGroups = [
    ...new Set(
      rows
        .filter((r) => r.errors.length === 0 && r.group && !known.has(r.group.toLowerCase()))
        .map((r) => r.group as string),
    ),
  ];

  const invalid = rows.filter((r) => r.errors.length > 0).length;
  return { rows, valid: rows.length - invalid, invalid, newGroups };
}

// Contraseña inicial legible: sin caracteres que se confundan (0/O, 1/l/I).
export function generatePassword() {
  const letters = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const chars = [
    ...Array.from({ length: 8 }, () => letters[randomInt(letters.length)]),
    ...Array.from({ length: 2 }, () => digits[randomInt(digits.length)]),
  ];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
