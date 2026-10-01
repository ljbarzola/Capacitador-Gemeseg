"use server";

import { audit } from "@/lib/audit";
import { canMarkAttendance, getSession, loadRoster } from "@/lib/attendance";
import { requireStaff } from "@/lib/dal";
import { getPrisma } from "@/lib/prisma";
import { syncEnrollment, syncEnrollments } from "@/lib/progress";
import type { AttendanceStatus } from "@/generated/prisma/client";

// Marcas de asistencia: se guardan al instante con cada casilla; las acciones masivas
// (marcar todos, quitar marcas, cerrar asistencia) actúan sobre toda la lista en pocas consultas.

export type Marks = Record<string, AttendanceStatus | null>;
export type AttendanceResult = { ok: true; marks: Marks; changed?: number } | { ok: false; error: string };

const STATUSES: AttendanceStatus[] = ["ATTENDED", "EXCUSED", "ABSENT"];

async function authorize(lessonId: string) {
  const actor = await requireStaff();
  const session = await getSession(lessonId);
  if (!session) return { ok: false as const, error: "La sesión ya no existe." };
  if (!canMarkAttendance(actor, session)) {
    return {
      ok: false as const,
      error: "Solo el instructor responsable de esta sesión o un administrador puede marcar la asistencia.",
    };
  }
  return { ok: true as const, actor, session };
}

const toMarks = (rows: { userId: string; status: AttendanceStatus | null }[]): Marks =>
  Object.fromEntries(rows.map((r) => [r.userId, r.status]));

// Una persona: casilla marcada = «Asistió»; «Justificar» = ausencia justificada; null = quitar la marca.
export async function markAttendance(
  lessonId: string,
  userId: string,
  status: AttendanceStatus | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await authorize(lessonId);
  if (!auth.ok) return { ok: false, error: auth.error };
  if (status !== null && !STATUSES.includes(status)) return { ok: false, error: "Estado no válido." };

  const prisma = getPrisma();
  const enrolled = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId: auth.session.courseId } },
    select: { id: true },
  });
  if (!enrolled) return { ok: false, error: "Esa persona no está inscrita en el curso." };

  if (status === null) {
    await prisma.sessionAttendance.deleteMany({ where: { lessonId, userId } });
  } else {
    await prisma.sessionAttendance.upsert({
      where: { lessonId_userId: { lessonId, userId } },
      create: { lessonId, userId, status, markedById: auth.actor.id },
      update: { status, markedAt: new Date(), markedById: auth.actor.id },
    });
  }
  await syncEnrollment(userId, auth.session.courseId);
  return { ok: true };
}

// «Marcar todos» (o los que se ven): pone «Asistió» a quien no lo tenga; respeta las justificadas.
export async function markAllAttendance(lessonId: string, userIds?: string[]): Promise<AttendanceResult> {
  const auth = await authorize(lessonId);
  if (!auth.ok) return { ok: false, error: auth.error };
  const { session, actor } = auth;
  const prisma = getPrisma();

  const roster = await loadRoster(session.courseId, lessonId);
  const scope = new Set(userIds ?? roster.map((r) => r.userId));
  const targets = roster.filter((r) => scope.has(r.userId) && r.status !== "ATTENDED" && r.status !== "EXCUSED");
  const ids = targets.map((r) => r.userId);

  if (ids.length) {
    const now = new Date();
    await prisma.$transaction([
      prisma.sessionAttendance.createMany({
        data: ids.map((userId) => ({ lessonId, userId, status: "ATTENDED" as const, markedAt: now, markedById: actor.id })),
        skipDuplicates: true,
      }),
      // Quienes ya tenían una marca (p. ej. «No asistió» o una de un ciclo anterior) pasan a «Asistió» con fecha de hoy.
      prisma.sessionAttendance.updateMany({
        where: { lessonId, userId: { in: ids } },
        data: { status: "ATTENDED", markedAt: now, markedById: actor.id },
      }),
    ]);
    await syncEnrollments(session.courseId, ids);
    await audit(actor, "sesion.asistencia", `Asistencia «${session.title}» (${session.courseTitle}): ${ids.length} marcados como «Asistió»`, {
      entity: "sesion",
      entityId: lessonId,
    });
  }
  const fresh = await loadRoster(session.courseId, lessonId);
  return { ok: true, marks: toMarks(fresh), changed: ids.length };
}

// Quita las marcas (de todos o de los que se ven).
export async function clearAttendance(lessonId: string, userIds?: string[]): Promise<AttendanceResult> {
  const auth = await authorize(lessonId);
  if (!auth.ok) return { ok: false, error: auth.error };
  const { session, actor } = auth;
  const prisma = getPrisma();

  const roster = await loadRoster(session.courseId, lessonId);
  const scope = new Set(userIds ?? roster.map((r) => r.userId));
  const ids = roster.filter((r) => scope.has(r.userId) && r.status !== null).map((r) => r.userId);

  if (ids.length) {
    await prisma.sessionAttendance.deleteMany({ where: { lessonId, userId: { in: ids } } });
    await syncEnrollments(session.courseId, ids);
    await audit(actor, "sesion.asistencia", `Asistencia «${session.title}» (${session.courseTitle}): se quitaron ${ids.length} marcas`, {
      entity: "sesion",
      entityId: lessonId,
    });
  }
  const fresh = await loadRoster(session.courseId, lessonId);
  return { ok: true, marks: toMarks(fresh), changed: ids.length };
}

// Al terminar la sesión: quienes quedaron sin marcar pasan a «No asistió».
export async function closeAttendance(lessonId: string): Promise<AttendanceResult> {
  const auth = await authorize(lessonId);
  if (!auth.ok) return { ok: false, error: auth.error };
  const { session, actor } = auth;
  const prisma = getPrisma();

  const roster = await loadRoster(session.courseId, lessonId);
  const ids = roster.filter((r) => r.status === null).map((r) => r.userId);
  if (ids.length) {
    const now = new Date();
    await prisma.$transaction([
      prisma.sessionAttendance.createMany({
        data: ids.map((userId) => ({ lessonId, userId, status: "ABSENT" as const, markedAt: now, markedById: actor.id })),
        skipDuplicates: true,
      }),
      // Una marca de un ciclo anterior se reemplaza por la nueva.
      prisma.sessionAttendance.updateMany({
        where: { lessonId, userId: { in: ids } },
        data: { status: "ABSENT", markedAt: now, markedById: actor.id },
      }),
    ]);
    await syncEnrollments(session.courseId, ids);
    await audit(actor, "sesion.asistencia", `Asistencia «${session.title}» (${session.courseTitle}) cerrada: ${ids.length} sin marcar pasaron a «No asistió»`, {
      entity: "sesion",
      entityId: lessonId,
    });
  }
  const fresh = await loadRoster(session.courseId, lessonId);
  return { ok: true, marks: toMarks(fresh), changed: ids.length };
}

// Estado actual (para refrescar la lista mientras otra persona también marca).
export async function getAttendanceSnapshot(lessonId: string): Promise<AttendanceResult> {
  await requireStaff();
  const session = await getSession(lessonId);
  if (!session) return { ok: false, error: "La sesión ya no existe." };
  return { ok: true, marks: toMarks(await loadRoster(session.courseId, lessonId)) };
}
