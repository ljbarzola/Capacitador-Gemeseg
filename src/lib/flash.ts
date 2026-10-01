// Mensajes de resultado tras una acción. Viajan en la URL como códigos (?ok=... / ?error=...) y
// solo se muestran los que están en esta lista, para no reflejar texto arbitrario de la URL.
export const FLASH = {
  guardado: "Cambios guardados.",
  comentario: "Gracias por sus comentarios.",
  creado: "Creado correctamente.",
  eliminado: "Eliminado correctamente.",
  asignado: "Curso asignado a {n} persona(s).",
  quitado: "Inscripción eliminada.",
  grupo_duplicado: "Ya existe un grupo con ese nombre.",
  sin_seleccion: "Seleccione a quién asignar el curso.",
  sin_destinatarios: "No hay personas que cumplan esa selección.",
  propia_cuenta: "No puede cambiar su propio rol ni desactivar su propia cuenta.",
  pregunta_invalida: "La pregunta no es válida: revise el texto, las opciones y la respuesta correcta.",
  leccion_invalida: "La lección no es válida: revise los campos.",
  enlace_invalido: "El enlace no es válido. Para video use YouTube o Vimeo.",
  campo_invalido: "El campo no es válido: escriba un nombre y, si es una lista, al menos dos opciones.",
  perfil_invalido: "Revise los datos de su perfil: hay campos obligatorios vacíos o con una opción no válida.",
  perfil_guardado: "Sus datos se guardaron.",
  sin_ultimo_admin: "Debe quedar al menos un administrador activo.",
} as const;

export type FlashCode = keyof typeof FLASH;

export function withFlash(path: string, kind: "ok" | "error", code: FlashCode, n?: number) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${kind}=${code}${n !== undefined ? `&n=${n}` : ""}`;
}

export function flashText(code: string | undefined, n?: string) {
  if (!code || !(code in FLASH)) return null;
  return FLASH[code as FlashCode].replace("{n}", String(Number(n) || 0));
}
