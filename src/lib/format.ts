// Fechas siempre en hora de Ecuador y en español.
const TIME_ZONE = "America/Guayaquil";

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: TIME_ZONE,
  }).format(new Date(date));
}

// «martes, 15 de octubre de 2026» y «08:30», para el detalle de una sesión en vivo.
export function formatLongDate(date: Date | string) {
  return new Intl.DateTimeFormat("es-EC", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: TIME_ZONE }).format(new Date(date));
}

export function formatTime(date: Date | string) {
  return new Intl.DateTimeFormat("es-EC", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TIME_ZONE }).format(new Date(date));
}

export function formatDateTime(date: Date | string) {
  return new Intl.DateTimeFormat("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  }).format(new Date(date));
}
