import * as z from "zod";
import { isValidCedula, normalizeCedula } from "@/lib/cedula";

// Validación del dígito verificador de la cédula ecuatoriana (src/lib/cedula.ts).
// Desactivada por ahora: se acepta cualquier documento de 5 a 20 caracteres. Para
// exigir cédula válida más adelante basta con cambiarla a true.
export const VALIDATE_CEDULA = false;

// Se usa en el navegador (aviso rápido) y en el servidor (la validación que cuenta).

const name = (label: string) =>
  z
    .string()
    .trim()
    .min(2, `${label}: mínimo 2 caracteres`)
    .max(80, `${label}: máximo 80 caracteres`)
    .transform((value) => value.replace(/\s+/g, " "));

export const registerSchema = z.object({
  firstNames: name("Nombres"),
  lastNames: name("Apellidos"),
  cedula: z
    .string()
    .trim()
    .transform((value) => normalizeCedula(value).toUpperCase())
    .pipe(
      z
        .string()
        .regex(/^[A-Z0-9]{5,20}$/, "Documento no válido (5 a 20 letras o números)")
        .refine((value) => !VALIDATE_CEDULA || isValidCedula(value), "Cédula ecuatoriana no válida"),
    ),
  email: z.string().trim().toLowerCase().pipe(z.email("Correo electrónico no válido")),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(128, "La contraseña es demasiado larga")
    .regex(/[a-zA-Z]/, "La contraseña debe incluir al menos una letra")
    .regex(/[0-9]/, "La contraseña debe incluir al menos un número"),
});

export type RegisterInput = z.input<typeof registerSchema>;

export type FieldErrors = Partial<Record<keyof RegisterInput, string[]>>;
