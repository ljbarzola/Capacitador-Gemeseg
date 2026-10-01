"use server";

import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/dal";
import { getAdminAuth } from "@/lib/firebase/admin";
import { getPrisma } from "@/lib/prisma";
import { analyzeCsv, generatePassword, type Analysis } from "@/lib/user-import";

export type ImportResult = {
  line: number;
  cedula: string;
  firstNames: string;
  lastNames: string;
  email: string;
  status: "creado" | "omitido" | "error";
  detail: string;
  password?: string;
};

export async function previewImport(text: string): Promise<Analysis> {
  await requireRole("ADMIN");
  return analyzeCsv(String(text ?? "").slice(0, 2_000_000));
}

// Crea las cuentas válidas (Firebase + base de datos). Las contraseñas iniciales solo se
// devuelven en esta respuesta: no se guardan en ningún lado.
export async function runImport(text: string): Promise<{ fatal?: string; results: ImportResult[] }> {
  const admin = await requireRole("ADMIN");
  const analysis = await analyzeCsv(String(text ?? "").slice(0, 2_000_000));
  if (analysis.fatal) return { fatal: analysis.fatal, results: [] };

  const prisma = getPrisma();
  const auth = getAdminAuth();
  const results: ImportResult[] = [];

  // Grupos: se crean los que no existen y se resuelve nombre → id sin distinguir mayúsculas.
  const wanted = [...new Set(analysis.rows.filter((r) => r.errors.length === 0 && r.group).map((r) => r.group as string))];
  if (wanted.length) await prisma.group.createMany({ data: wanted.map((name) => ({ name })), skipDuplicates: true });
  const groups = await prisma.group.findMany({ select: { id: true, name: true } });
  const groupId = new Map(groups.map((g) => [g.name.toLowerCase(), g.id]));

  for (const row of analysis.rows) {
    const base = { line: row.line, cedula: row.cedula, firstNames: row.firstNames, lastNames: row.lastNames, email: row.email };
    if (row.errors.length > 0) {
      results.push({ ...base, status: "omitido", detail: row.errors.join("; ") });
      continue;
    }
    const password = generatePassword();
    let uid: string | null = null;
    try {
      const created = await auth.createUser({
        email: row.email,
        password,
        displayName: `${row.firstNames} ${row.lastNames}`,
      });
      uid = created.uid;
      await prisma.user.create({
        data: {
          firebaseUid: uid,
          email: row.email,
          firstNames: row.firstNames,
          lastNames: row.lastNames,
          cedula: row.cedula,
          extraFields: row.extra,
          mustChangePassword: true,
          groupId: row.group ? (groupId.get(row.group.toLowerCase()) ?? null) : null,
        },
      });
      results.push({ ...base, status: "creado", detail: row.notes.join("; "), password });
    } catch (error) {
      if (uid) await auth.deleteUser(uid).catch(() => {});
      const code = (error as { code?: string }).code;
      results.push({
        ...base,
        status: "error",
        detail:
          code === "auth/email-already-exists"
            ? "El correo ya tiene una cuenta"
            : code === "P2002"
              ? "La cédula o el correo ya están registrados"
              : "No se pudo crear la cuenta",
      });
    }
  }

  const created = results.filter((r) => r.status === "creado").length;
  await audit(
    admin,
    "usuario.importar",
    `Importación de usuarios: ${created} cuenta(s) creada(s), ${results.length - created} omitida(s) o con error`,
    { entity: "usuario", meta: { creadas: created, total: results.length } },
  );
  return { results };
}
