"use client";

import { useState } from "react";
import { Badge, Button, Card, TableWrap, Td, Th } from "@/components/ui";
import { toCsv } from "@/lib/csv";
import type { Analysis } from "@/lib/user-import";
import { previewImport, runImport, type ImportResult } from "./actions";

type Step = "choose" | "preview" | "done";

function download(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function ImportForm() {
  const [step, setStep] = useState<Step>("choose");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setFileName(file.name);
    setBusy(true);
    try {
      const content = await file.text();
      setText(content);
      const result = await previewImport(content);
      if (result.fatal) {
        setError(result.fatal);
        setAnalysis(null);
      } else {
        setAnalysis(result);
        setStep("preview");
      }
    } catch {
      setError("No se pudo leer el archivo. Verifique que sea un CSV.");
    }
    setBusy(false);
  }

  async function onRun() {
    setBusy(true);
    setError(null);
    try {
      const out = await runImport(text);
      if (out.fatal) {
        setError(out.fatal);
      } else {
        setResults(out.results);
        setStep("done");
      }
    } catch {
      setError("La importación se interrumpió. Revise la lista de usuarios antes de volver a intentarlo.");
    }
    setBusy(false);
  }

  function reset() {
    setStep("choose");
    setText("");
    setFileName("");
    setAnalysis(null);
    setResults([]);
    setError(null);
  }

  const created = results.filter((r) => r.status === "creado");

  return (
    <div className="flex flex-col gap-5">
      {error && (
        <p role="alert" className="rounded-md border-l-4 border-red-600 bg-red-50 px-4 py-3 text-sm text-red-900">
          {error}
        </p>
      )}

      {step === "choose" && (
        <Card className="max-w-2xl">
          <h2 className="text-lg text-navy">1. Elija el archivo</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Archivo CSV con una persona por fila (máximo 500). Se puede guardar desde Excel con «CSV (delimitado por comas)».
          </p>
          <label className="mt-4 block text-sm font-medium text-navy">
            Archivo CSV
            <input
              type="file"
              accept=".csv,text/csv"
              disabled={busy}
              onChange={(e) => onFile(e.target.files?.[0])}
              className="mt-1.5 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-navy file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
            />
          </label>
          {busy && <p className="mt-3 text-sm text-zinc-600">Revisando el archivo…</p>}
        </Card>
      )}

      {step === "preview" && analysis && (
        <>
          <Card>
            <h2 className="text-lg text-navy">2. Revise antes de crear</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Archivo: <span className="font-medium text-navy">{fileName}</span> · {analysis.rows.length} fila(s):{" "}
              <span className="font-semibold text-green-800">{analysis.valid} correcta(s)</span>
              {analysis.invalid > 0 && (
                <>
                  , <span className="font-semibold text-red-700">{analysis.invalid} con problemas</span> (se omitirán)
                </>
              )}
              .
            </p>
            {analysis.newGroups.length > 0 && (
              <p className="mt-2 text-sm text-zinc-600">
                Se crearán los grupos nuevos: <span className="font-medium text-navy">{analysis.newGroups.join(", ")}</span>.
              </p>
            )}
            <p className="mt-2 text-sm text-zinc-600">
              Cada cuenta recibirá una contraseña inicial generada. Al terminar podrá descargarlas; <strong>no se vuelven a mostrar</strong>.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={onRun} disabled={busy || analysis.valid === 0}>
                {busy ? "Creando cuentas…" : `Crear ${analysis.valid} cuenta(s)`}
              </Button>
              <Button variant="secondary" onClick={reset} disabled={busy}>
                Elegir otro archivo
              </Button>
            </div>
          </Card>

          <TableWrap minWidth={820}>
            <thead>
              <tr>
                <Th className="w-14">Línea</Th>
                <Th>Persona</Th>
                <Th>Cédula</Th>
                <Th>Correo</Th>
                <Th>Grupo</Th>
                <Th>Resultado</Th>
              </tr>
            </thead>
            <tbody>
              {analysis.rows.map((row) => (
                <tr key={row.line} className={row.errors.length ? "bg-red-50/50" : undefined}>
                  <Td className="text-zinc-500">{row.line}</Td>
                  <Td className="font-medium">
                    {row.lastNames} {row.firstNames}
                  </Td>
                  <Td>{row.cedula}</Td>
                  <Td className="text-zinc-600">{row.email}</Td>
                  <Td className="text-zinc-600">{row.group ?? "—"}</Td>
                  <Td>
                    {row.errors.length ? (
                      <span className="text-sm text-red-800">{row.errors.join("; ")}</span>
                    ) : (
                      <span className="text-sm text-green-800">
                        Correcta{row.notes.length ? ` · ${row.notes.join("; ")}` : ""}
                      </span>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </>
      )}

      {step === "done" && (
        <>
          <Card>
            <h2 className="text-lg text-navy">3. Importación terminada</h2>
            <p className="mt-1 text-sm text-zinc-600">
              <span className="font-semibold text-green-800">{created.length} cuenta(s) creada(s)</span>
              {results.length - created.length > 0 && <>, {results.length - created.length} omitida(s) o con error</>}.
            </p>
            <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-950">
              Descargue ahora las contraseñas iniciales y entréguelas a cada persona: esta es la única vez que se muestran. Al ingresar, el
              sistema les pedirá cambiarla.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                onClick={() =>
                  download(
                    "usuarios-importados.csv",
                    toCsv([
                      ["Cédula", "Nombres", "Apellidos", "Correo", "Contraseña inicial", "Estado", "Detalle"],
                      ...results.map((r) => [r.cedula, r.firstNames, r.lastNames, r.email, r.password ?? "", r.status, r.detail]),
                    ]),
                  )
                }
              >
                Descargar contraseñas y resultados (CSV)
              </Button>
              <Button variant="secondary" onClick={reset}>
                Importar otro archivo
              </Button>
            </div>
          </Card>
          <TableWrap minWidth={760}>
            <thead>
              <tr>
                <Th className="w-14">Línea</Th>
                <Th>Persona</Th>
                <Th>Correo</Th>
                <Th>Estado</Th>
                <Th>Detalle</Th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.line}>
                  <Td className="text-zinc-500">{r.line}</Td>
                  <Td className="font-medium">
                    {r.lastNames} {r.firstNames}
                  </Td>
                  <Td className="text-zinc-600">{r.email}</Td>
                  <Td>
                    <Badge tone={r.status === "creado" ? "green" : r.status === "omitido" ? "amber" : "red"}>
                      {r.status === "creado" ? "Creada" : r.status === "omitido" ? "Omitida" : "Error"}
                    </Badge>
                  </Td>
                  <Td className="text-sm text-zinc-600">{r.detail}</Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </>
      )}
    </div>
  );
}
