import type { AttendanceStatus } from "@/generated/prisma/client";

// Sesiones en vivo (clases por Meet, Zoom, Teams…): fechas, estado y asistencia.
// Módulo sin dependencias de servidor: también lo usan los componentes de pantalla.

const TIME_ZONE = "America/Guayaquil"; // UTC-5, sin horario de verano

// Sin hora de fin: una sesión se considera "en curso" hasta 2 horas después de iniciar
// (así sigue visible en «Próximas sesiones» para quien se conecta tarde).
export const SESSION_WINDOW_MS = 2 * 60 * 60 * 1000;

export type SessionPhase = "scheduled" | "live" | "finished";

export function sessionPhase(startsAt: Date, now = new Date()): SessionPhase {
  const elapsed = now.getTime() - startsAt.getTime();
  if (elapsed < 0) return "scheduled";
  return elapsed <= SESSION_WINDOW_MS ? "live" : "finished";
}

export const PHASE_LABEL: Record<SessionPhase, string> = {
  scheduled: "Programada",
  live: "En curso",
  finished: "Finalizada",
};

export const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  ATTENDED: "Asistió",
  EXCUSED: "Justificada",
  ABSENT: "No asistió",
};

// Asistió y Justificada cuentan como sesión cumplida.
export function countsAsDone(status: AttendanceStatus | null | undefined) {
  return status === "ATTENDED" || status === "EXCUSED";
}

// Etiqueta del proveedor de videollamada según el dominio del enlace.
export function meetingProvider(url: string | null | undefined): string | null {
  if (!url) return null;
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
  const is = (domain: string) => host === domain || host.endsWith(`.${domain}`);
  if (is("meet.google.com")) return "Google Meet";
  if (is("zoom.us") || is("zoom.com")) return "Zoom";
  if (is("teams.microsoft.com") || is("teams.live.com") || is("teams.microsoft.us")) return "Microsoft Teams";
  if (is("webex.com")) return "Webex";
  return "Enlace de la reunión";
}

// «Hoy» / «Mañana» según el calendario de Ecuador; null si es otro día.
export function relativeDay(date: Date, now = new Date()): "Hoy" | "Mañana" | null {
  const day = toDateTimeParts(date).date;
  const today = toDateTimeParts(now).date;
  if (day === today) return "Hoy";
  const tomorrow = toDateTimeParts(new Date(now.getTime() + 24 * 60 * 60 * 1000)).date;
  return day === tomorrow ? "Mañana" : null;
}

// Día y mes cortos para el recuadro de fecha («15», «oct»).
export function dayAndMonth(date: Date) {
  const parts = new Intl.DateTimeFormat("es-EC", { day: "numeric", month: "short", timeZone: TIME_ZONE }).formatToParts(date);
  return {
    day: parts.find((p) => p.type === "day")?.value ?? "",
    month: (parts.find((p) => p.type === "month")?.value ?? "").replace(".", ""),
  };
}

// «2026-10-15» + «08:30» (hora de Ecuador) → instante UTC. null si no es válido.
export function parseSessionDate(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const result = new Date(`${date}T${time}:00-05:00`);
  return Number.isNaN(result.getTime()) ? null : result;
}

// Instante → partes para los campos de fecha y hora del formulario (hora de Ecuador).
export function toDateTimeParts(date: Date) {
  const [d, t] = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(date)
    .split(" ");
  return { date: d, time: t };
}
