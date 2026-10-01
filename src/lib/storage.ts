import "server-only";
import { randomUUID } from "node:crypto";
import { getStorage } from "firebase-admin/storage";
import { getAdminApp } from "@/lib/firebase/admin";

// Archivos de lecciones (videos, imágenes, documentos) en un bucket privado de Cloud Storage.
// El navegador sube y descarga con URLs firmadas de corta duración; nunca hay acceso público.

const URL_TTL_MS = 15 * 60 * 1000;

function bucket() {
  const name = process.env.MEDIA_BUCKET ?? "capacitaciongemeseg-media";
  return getStorage(getAdminApp()).bucket(name);
}

export function safeFileName(name: string) {
  const clean = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w.-]+/g, "_")
    .slice(-80);
  return clean || "archivo";
}

export function newStoragePath(fileName: string) {
  return `lessons/${randomUUID()}/${safeFileName(fileName)}`;
}

// maxBytes se firma como cabecera obligatoria: Cloud Storage rechaza archivos más grandes.
export async function createUploadUrl(path: string, contentType: string, maxBytes: number) {
  const [url] = await bucket()
    .file(path)
    .getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + URL_TTL_MS,
      contentType,
      extensionHeaders: { "x-goog-content-length-range": `0,${maxBytes}` },
    });
  return url;
}

// Devuelve null si no se puede firmar (p. ej. sin credenciales en desarrollo local).
export async function createReadUrl(path: string, downloadName?: string) {
  try {
    const [url] = await bucket()
      .file(path)
      .getSignedUrl({
        version: "v4",
        action: "read",
        expires: Date.now() + URL_TTL_MS,
        responseDisposition: downloadName
          ? `attachment; filename="${safeFileName(downloadName)}"`
          : undefined,
      });
    return url;
  } catch (error) {
    console.error("storage: no se pudo firmar la URL de lectura", error);
    return null;
  }
}

export async function deleteObject(path: string) {
  await bucket()
    .file(path)
    .delete({ ignoreNotFound: true })
    .catch((error) => console.error("storage: no se pudo borrar", error));
}
