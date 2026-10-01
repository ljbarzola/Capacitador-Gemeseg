import * as z from "zod";

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
  // Cédula: exactamente 10 dígitos. No se valida el dígito verificador (src/lib/cedula.ts queda
  // disponible por si más adelante se decide exigirlo).
  cedula: z
    .string()
    .trim()
    .regex(/^\d{10}$/, "La cédula debe tener exactamente 10 números"),
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
