import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";

// Registro de auditoría: quién hizo qué y cuándo. Nunca interrumpe la acción original.

export type Actor = { id: string; firstNames: string; lastNames: string } | null;

// Códigos de acción y su descripción para el filtro de la pantalla de auditoría.
export const AUDIT_ACTIONS = {
  "usuario.registro": "Registro de usuario",
  "usuario.actualizar": "Cambio de rol, grupo o estado",
  "usuario.importar": "Importación de usuarios",
  "usuario.contrasena": "Cambio de contraseña",
  "grupo.crear": "Grupo creado",
  "grupo.renombrar": "Grupo renombrado",
  "grupo.eliminar": "Grupo eliminado",
  "campo.crear": "Campo de registro creado",
  "campo.actualizar": "Campo de registro modificado",
  "campo.eliminar": "Campo de registro eliminado",
  "curso.crear": "Curso creado",
  "curso.actualizar": "Curso modificado",
  "curso.eliminar": "Curso eliminado",
  "contenido.crear": "Contenido agregado",
  "contenido.actualizar": "Contenido modificado",
  "contenido.eliminar": "Contenido eliminado",
  "examen.configurar": "Examen configurado",
  "examen.eliminar": "Examen eliminado",
  "pregunta.guardar": "Pregunta guardada",
  "pregunta.eliminar": "Pregunta eliminada",
  "inscripcion.asignar": "Curso asignado",
  "inscripcion.quitar": "Inscripción eliminada",
  "certificado.emitir": "Certificado emitido",
  "certificado.renovar": "Recertificación iniciada",
} as const;

export type AuditAction = keyof typeof AUDIT_ACTIONS;

export async function audit(
  actor: Actor,
  action: AuditAction,
  summary: string,
  extra: { entity?: string; entityId?: string; meta?: Prisma.InputJsonValue } = {},
) {
  try {
    await getPrisma().auditLog.create({
      data: {
        actorId: actor?.id ?? null,
        actorName: actor ? `${actor.firstNames} ${actor.lastNames}` : "Sistema",
        action,
        summary: summary.slice(0, 500),
        entity: extra.entity,
        entityId: extra.entityId,
        meta: extra.meta,
      },
    });
  } catch (error) {
    console.error("audit: no se pudo registrar", action, error);
  }
}
