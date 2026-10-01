// Lectura tipada de FormData en las acciones del servidor.

export function str(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export function optStr(formData: FormData, name: string): string | null {
  return str(formData, name) || null;
}

export function int(formData: FormData, name: string): number | null {
  const raw = str(formData, name);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isInteger(value) ? value : null;
}

export function bool(formData: FormData, name: string): boolean {
  const value = formData.get(name);
  return value === "on" || value === "true" || value === "1";
}

export function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
