"use client";

import { useState } from "react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { requestUpload, saveLesson } from "../../../actions";

type LessonType = "TEXT" | "VIDEO_EMBED" | "VIDEO_UPLOAD" | "IMAGE" | "LINK" | "FILE";

const TYPES: { value: LessonType; label: string }[] = [
  { value: "TEXT", label: "Texto" },
  { value: "VIDEO_EMBED", label: "Video de YouTube o Vimeo" },
  { value: "VIDEO_UPLOAD", label: "Video subido (archivo)" },
  { value: "IMAGE", label: "Imagen" },
  { value: "LINK", label: "Enlace externo" },
  { value: "FILE", label: "Archivo para descargar" },
];

type Initial = {
  id: string;
  title: string;
  type: LessonType;
  body: string | null;
  url: string | null;
  storagePath: string | null;
  fileName: string | null;
};

type Upload =
  | { state: "idle" }
  | { state: "uploading"; percent: number }
  | { state: "error"; message: string };

function putFile(url: string, file: File, contentType: string, maxBytes: number, onProgress: (p: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.setRequestHeader("x-goog-content-length-range", `0,${maxBytes}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Error ${xhr.status}`)));
    xhr.onerror = () => reject(new Error("Fallo de red"));
    xhr.send(file);
  });
}

export function LessonForm({
  courseId,
  submoduleId,
  initial,
}: {
  courseId: string;
  submoduleId?: string;
  initial?: Initial;
}) {
  const [type, setType] = useState<LessonType>(initial?.type ?? "TEXT");
  const [storagePath, setStoragePath] = useState(initial?.storagePath ?? "");
  const [fileName, setFileName] = useState(initial?.fileName ?? "");
  const [upload, setUpload] = useState<Upload>({ state: "idle" });

  const needsFile = type === "VIDEO_UPLOAD" || type === "FILE" || type === "IMAGE";

  async function onFile(file: File | undefined) {
    if (!file) return;
    setUpload({ state: "uploading", percent: 0 });
    try {
      const signed = await requestUpload({
        kind: type,
        fileName: file.name,
        contentType: file.type,
        size: file.size,
      });
      if ("error" in signed) {
        setUpload({ state: "error", message: signed.error });
        return;
      }
      await putFile(signed.uploadUrl, file, signed.contentType, signed.maxBytes, (percent) =>
        setUpload({ state: "uploading", percent }),
      );
      setStoragePath(signed.path);
      setFileName(file.name);
      setUpload({ state: "idle" });
    } catch (error) {
      setUpload({
        state: "error",
        message: `No se pudo subir el archivo (${error instanceof Error ? error.message : "error"}). Intente de nuevo.`,
      });
    }
  }

  const accept = type === "VIDEO_UPLOAD" ? "video/*" : type === "IMAGE" ? "image/*" : undefined;

  return (
    <form action={saveLesson} className="grid gap-4">
      <input type="hidden" name="courseId" value={courseId} />
      {initial && <input type="hidden" name="lessonId" value={initial.id} />}
      {submoduleId && <input type="hidden" name="submoduleId" value={submoduleId} />}
      <input type="hidden" name="storagePath" value={needsFile ? storagePath : ""} />
      <input type="hidden" name="fileName" value={needsFile ? fileName : ""} />

      <Field label="Título de la lección">
        <Input name="title" defaultValue={initial?.title} required maxLength={150} />
      </Field>

      <Field label="Tipo de contenido">
        <Select
          name="type"
          value={type}
          onChange={(event) => {
            setType(event.target.value as LessonType);
            setStoragePath("");
            setFileName("");
            setUpload({ state: "idle" });
          }}
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
      </Field>

      {type === "TEXT" && (
        <Field label="Contenido" hint="Separe los párrafos con una línea en blanco.">
          <Textarea name="body" defaultValue={initial?.body ?? ""} rows={12} maxLength={50000} required />
        </Field>
      )}

      {(type === "VIDEO_EMBED" || type === "LINK") && (
        <Field
          label={type === "VIDEO_EMBED" ? "Enlace del video" : "Enlace"}
          hint={type === "VIDEO_EMBED" ? "Pegue la dirección del video de YouTube o Vimeo." : "Debe empezar con https://"}
        >
          <Input name="url" type="url" defaultValue={initial?.url ?? ""} required placeholder="https://" />
        </Field>
      )}

      {type === "IMAGE" && !storagePath && (
        <Field label="O use la dirección de una imagen (opcional)" hint="Si sube un archivo abajo, se usará el archivo.">
          <Input name="url" type="url" defaultValue={initial?.url ?? ""} placeholder="https://" />
        </Field>
      )}

      {needsFile && (
        <div className="flex flex-col gap-2">
          <Field
            label={type === "VIDEO_UPLOAD" ? "Archivo de video" : type === "IMAGE" ? "Archivo de imagen" : "Archivo"}
            hint={
              type === "VIDEO_UPLOAD"
                ? "Máximo 2 GB."
                : type === "IMAGE"
                  ? "Máximo 10 MB."
                  : "Máximo 100 MB."
            }
          >
            <input
              type="file"
              accept={accept}
              onChange={(event) => onFile(event.target.files?.[0])}
              disabled={upload.state === "uploading"}
              className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-navy file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
            />
          </Field>
          {upload.state === "uploading" && (
            <div role="status" className="text-sm text-zinc-700">
              Subiendo… {upload.percent}%
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-200">
                <div className="h-full bg-brand transition-all" style={{ width: `${upload.percent}%` }} />
              </div>
            </div>
          )}
          {upload.state === "error" && (
            <p role="alert" className="text-sm text-red-700">
              {upload.message}
            </p>
          )}
          {storagePath && upload.state !== "uploading" && (
            <p className="text-sm text-green-800">✓ Archivo listo: {fileName || storagePath}</p>
          )}
        </div>
      )}

      <div>
        <Button type="submit" disabled={upload.state === "uploading" || (needsFile && type !== "IMAGE" && !storagePath)}>
          {initial ? "Guardar lección" : "Crear lección"}
        </Button>
      </div>
    </form>
  );
}
