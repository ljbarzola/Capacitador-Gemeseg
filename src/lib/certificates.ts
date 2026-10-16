import "server-only";
import { randomInt } from "node:crypto";
import { audit } from "@/lib/audit";
import { getPrisma } from "@/lib/prisma";

// Certificados: se emiten solos (uno por módulo al finalizarlo y el final al completar el curso) y se
// descargan en la plataforma (PDF). La vigencia sale de Course.recertMonths (12 por defecto,
// configurable; vacío = no vence) y es la misma para el certificado final y los de módulo.

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin 0/O ni 1/I para evitar confusiones
export const EXPIRING_DAYS = 30;

export function newCertificateCode() {
  const pick = (n: number) => Array.from({ length: n }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `GMS-${pick(4)}-${pick(4)}`;
}

export function normalizeCode(input: string) {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}

export function addMonths(date: Date, months: number) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export type CertState = "valid" | "expiring" | "expired" | "no_expiry";

export function certState(expiresAt: Date | null, now = new Date()): CertState {
  if (!expiresAt) return "no_expiry";
  if (expiresAt <= now) return "expired";
  if (expiresAt.getTime() - now.getTime() <= EXPIRING_DAYS * 24 * 60 * 60 * 1000) return "expiring";
  return "valid";
}

export const CERT_STATE_LABEL: Record<CertState, string> = {
  valid: "Vigente",
  expiring: "Por vencer",
  expired: "Vencido",
  no_expiry: "Vigente (sin vencimiento)",
};

// Texto corto del tipo de certificado (pantallas y verificación pública).
export const CERT_KIND_LABEL = { COURSE: "Certificado final del curso", MODULE: "Certificado de módulo" } as const;

// Emite el certificado del ciclo actual si todavía no existe (idempotente). `target` null = el
// certificado final del curso; con un módulo, el de ese módulo (uno por módulo y ciclo).
async function issue(enrollmentId: string, target: { id: string; title: string } | null) {
  const prisma = getPrisma();
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: {
      id: true,
      cycleStartedAt: true,
      user: { select: { firstNames: true, lastNames: true, cedula: true } },
      course: { select: { title: true, recertMonths: true } },
    },
  });
  if (!enrollment) return null;

  const existing = await prisma.certificate.findFirst({
    where: target
      ? { enrollmentId, kind: "MODULE", moduleId: target.id, issuedAt: { gte: enrollment.cycleStartedAt } }
      : { enrollmentId, kind: "COURSE", issuedAt: { gte: enrollment.cycleStartedAt } },
  });
  if (existing) return existing;

  const issuedAt = new Date();
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const created = await prisma.certificate.create({
        data: {
          code: newCertificateCode(),
          enrollmentId,
          kind: target ? "MODULE" : "COURSE",
          moduleId: target?.id ?? null,
          moduleTitle: target?.title ?? null,
          holderName: `${enrollment.user.firstNames} ${enrollment.user.lastNames}`,
          holderCedula: enrollment.user.cedula,
          courseTitle: enrollment.course.title,
          issuedAt,
          expiresAt: enrollment.course.recertMonths ? addMonths(issuedAt, enrollment.course.recertMonths) : null,
        },
      });
      await audit(
        null,
        "certificado.emitir",
        target
          ? `Certificado ${created.code} emitido a ${created.holderName} por el módulo «${target.title}» de «${created.courseTitle}»`
          : `Certificado ${created.code} emitido a ${created.holderName} por «${created.courseTitle}»`,
        { entity: "certificado", entityId: created.id },
      );
      return created;
    } catch (error) {
      if ((error as { code?: string }).code !== "P2002") throw error; // código repetido: reintentar
    }
  }
  throw new Error("No se pudo generar un código de certificado único");
}

// Certificado final del curso (el que ya existía).
export function issueCertificate(enrollmentId: string) {
  return issue(enrollmentId, null);
}

// Certificado de un módulo; solo si el módulo tiene activada la casilla «Emite certificado».
export async function issueModuleCertificate(enrollmentId: string, moduleId: string) {
  const found = await getPrisma().module.findUnique({
    where: { id: moduleId },
    select: { id: true, title: true, issuesCertificate: true },
  });
  if (!found || !found.issuesCertificate) return null;
  return issue(enrollmentId, found);
}

// Reinicia el ciclo: el avance anterior deja de contar, pero los certificados previos se conservan.
export async function startRecertification(enrollmentId: string) {
  await getPrisma().enrollment.update({
    where: { id: enrollmentId },
    data: { cycleStartedAt: new Date(), status: "ASSIGNED", completedAt: null },
  });
}

export function maskCedula(cedula: string) {
  return cedula.length > 4 ? `${"*".repeat(cedula.length - 4)}${cedula.slice(-4)}` : cedula;
}
