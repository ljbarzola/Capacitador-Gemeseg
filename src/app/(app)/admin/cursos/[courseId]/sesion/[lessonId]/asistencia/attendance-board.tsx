"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconCheck } from "@/components/icons";
import { Badge, Button, Input, ProgressBar, Select } from "@/components/ui";
import type { AttendanceStatus } from "@/generated/prisma/client";
import {
  clearAttendance,
  closeAttendance,
  getAttendanceSnapshot,
  markAllAttendance,
  markAttendance,
  type AttendanceResult,
  type Marks,
} from "./actions";

export type BoardRow = { userId: string; name: string; cedula: string; group: string | null };

type View = "all" | "unmarked" | "marked";
type Notice = { kind: "ok" | "error"; text: string } | null;

const plain = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const Row = memo(function Row({
  row,
  status,
  editable,
  onSet,
}: {
  row: BoardRow;
  status: AttendanceStatus | null;
  editable: boolean;
  onSet: (userId: string, status: AttendanceStatus | null) => void;
}) {
  const attended = status === "ATTENDED";
  return (
    <li className={`flex items-center gap-2 border-b border-zinc-100 last:border-b-0 ${attended ? "bg-emerald-50/60" : ""}`}>
      <label className={`flex min-w-0 flex-1 items-center gap-3 px-4 py-3 ${editable ? "cursor-pointer" : ""}`}>
        <input
          type="checkbox"
          checked={attended}
          disabled={!editable}
          onChange={(event) => onSet(row.userId, event.target.checked ? "ATTENDED" : null)}
          aria-label={`Asistió: ${row.name}`}
          className="size-5 shrink-0 accent-[#15803d]"
        />
        <span className="min-w-0">
          <span className="block truncate font-medium text-navy">{row.name}</span>
          <span className="block truncate text-xs text-zinc-500">
            Cédula {row.cedula}
            {row.group ? ` · ${row.group}` : ""}
          </span>
        </span>
      </label>
      <div className="flex shrink-0 items-center gap-2 pr-4">
        {status === "EXCUSED" && <Badge tone="teal">Justificada</Badge>}
        {status === "ABSENT" && <Badge tone="red">No asistió</Badge>}
        {editable && status === "EXCUSED" && (
          <button type="button" onClick={() => onSet(row.userId, null)} className="text-xs font-semibold text-zinc-600 underline underline-offset-2 hover:text-navy">
            Quitar
          </button>
        )}
        {editable && status !== "ATTENDED" && status !== "EXCUSED" && (
          <button type="button" onClick={() => onSet(row.userId, "EXCUSED")} className="text-xs font-semibold text-zinc-600 underline underline-offset-2 hover:text-navy">
            Justificar
          </button>
        )}
      </div>
    </li>
  );
});

export function AttendanceBoard({
  lessonId,
  rows,
  initialMarks,
  groups,
  canEdit,
}: {
  lessonId: string;
  rows: BoardRow[];
  initialMarks: Marks;
  groups: string[];
  canEdit: boolean;
}) {
  const [marks, setMarks] = useState<Marks>(initialMarks);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>("all");
  const [group, setGroup] = useState("");
  const [saving, setSaving] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const savingRef = useRef(0);
  const busyRef = useRef(false);

  // Cada casilla se guarda al instante; si el servidor la rechaza, vuelve a su estado anterior.
  const onSet = useCallback(
    (userId: string, status: AttendanceStatus | null) => {
      let previous: AttendanceStatus | null = null;
      setMarks((m) => {
        previous = m[userId] ?? null;
        return { ...m, [userId]: status };
      });
      savingRef.current++;
      setSaving((n) => n + 1);
      markAttendance(lessonId, userId, status)
        .then((result) => {
          if (!result.ok) {
            setMarks((m) => ({ ...m, [userId]: previous }));
            setNotice({ kind: "error", text: result.error });
          }
        })
        .catch(() => {
          setMarks((m) => ({ ...m, [userId]: previous }));
          setNotice({ kind: "error", text: "No se pudo guardar. Revise su conexión e intente de nuevo." });
        })
        .finally(() => {
          savingRef.current--;
          setSaving((n) => n - 1);
        });
    },
    [lessonId],
  );

  // Refresca la lista cada pocos segundos (por si otra persona también marca), sin pisar lo que se está guardando.
  useEffect(() => {
    const timer = setInterval(async () => {
      if (document.hidden || savingRef.current > 0 || busyRef.current) return;
      const result = await getAttendanceSnapshot(lessonId).catch(() => null);
      if (result?.ok && savingRef.current === 0 && !busyRef.current) setMarks(result.marks);
    }, 8000);
    return () => clearInterval(timer);
  }, [lessonId]);

  const visible = useMemo(() => {
    const q = plain(query.trim());
    return rows.filter((row) => {
      const status = marks[row.userId] ?? null;
      if (group && row.group !== group) return false;
      if (view === "unmarked" && status !== null) return false;
      if (view === "marked" && status === null) return false;
      return !q || plain(`${row.name} ${row.cedula}`).includes(q);
    });
  }, [rows, marks, query, group, view]);

  const counts = useMemo(() => {
    let attended = 0, excused = 0, absent = 0;
    for (const row of rows) {
      const status = marks[row.userId] ?? null;
      if (status === "ATTENDED") attended++;
      else if (status === "EXCUSED") excused++;
      else if (status === "ABSENT") absent++;
    }
    return { attended, excused, absent, unmarked: rows.length - attended - excused - absent };
  }, [rows, marks]);

  async function runBulk(action: () => Promise<AttendanceResult>, success: (changed: number) => string) {
    busyRef.current = true;
    setBusy(true);
    setNotice(null);
    try {
      const result = await action();
      if (result.ok) {
        setMarks(result.marks);
        setNotice({ kind: "ok", text: success(result.changed ?? 0) });
      } else {
        setNotice({ kind: "error", text: result.error });
      }
    } catch {
      setNotice({ kind: "error", text: "La operación no terminó. Revise la lista y vuelva a intentarlo." });
    }
    busyRef.current = false;
    setBusy(false);
  }

  const scoped = visible.length !== rows.length ? visible.map((r) => r.userId) : undefined;
  const percent = rows.length ? Math.round(((counts.attended + counts.excused) / rows.length) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-0 z-10 -mx-1 flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white/95 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2" aria-live="polite">
          <div>
            <p className="text-sm text-zinc-600">Asistieron</p>
            <p className="text-3xl font-semibold leading-none text-navy" style={{ fontStretch: "88%" }}>
              {counts.attended} <span className="text-lg font-normal text-zinc-500">de {rows.length}</span>
            </p>
          </div>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-600">
            <span>Justificadas: <strong className="text-navy">{counts.excused}</strong></span>
            <span>No asistieron: <strong className="text-navy">{counts.absent}</strong></span>
            <span>Sin marcar: <strong className="text-navy">{counts.unmarked}</strong></span>
          </p>
          <p className="inline-flex items-center gap-1.5 text-xs text-zinc-500" role="status">
            {saving > 0 || busy ? (
              "Guardando…"
            ) : (
              <>
                <IconCheck width={14} height={14} strokeWidth={2.2} className="text-green-700" /> Todo guardado
              </>
            )}
          </p>
        </div>
        <ProgressBar percent={percent} fill="bg-emerald-600" />

        <div className="grid gap-2 md:grid-cols-[1fr_12rem_auto]">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre, apellido o cédula"
            aria-label="Buscar en la lista"
            type="search"
          />
          <Select value={group} onChange={(event) => setGroup(event.target.value)} aria-label="Filtrar por grupo">
            <option value="">Todos los grupos</option>
            {groups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </Select>
          <div className="flex rounded-md border border-zinc-300 bg-white p-0.5" role="group" aria-label="Mostrar">
            {([
              ["all", "Todos"],
              ["unmarked", "Sin marcar"],
              ["marked", "Con marca"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setView(value)}
                aria-pressed={view === value}
                className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${view === value ? "bg-navy text-white" : "text-navy hover:bg-zinc-100"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {canEdit && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              disabled={busy || visible.length === 0}
              onClick={() => {
                const n = visible.filter((r) => !["ATTENDED", "EXCUSED"].includes(marks[r.userId] ?? "")).length;
                if (n === 0) return setNotice({ kind: "ok", text: "Todos los que se ven ya tienen asistencia." });
                if (window.confirm(`¿Marcar «Asistió» a ${n} persona(s)${scoped ? " de las que se ven" : ""}?`)) {
                  runBulk(() => markAllAttendance(lessonId, scoped), (c) => `${c} persona(s) marcadas como «Asistió».`);
                }
              }}
            >
              {scoped ? `Marcar los ${visible.length} que se ven` : "Marcar todos"}
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => {
                if (window.confirm(`¿Quitar las marcas${scoped ? " de las personas que se ven" : " de toda la lista"}?`)) {
                  runBulk(() => clearAttendance(lessonId, scoped), (c) => `Se quitaron ${c} marca(s).`);
                }
              }}
            >
              Quitar marcas
            </Button>
            <Button
              variant="dark"
              disabled={busy || counts.unmarked === 0}
              onClick={() => {
                if (window.confirm(`Cerrar la asistencia: las ${counts.unmarked} personas sin marcar quedarán como «No asistió». ¿Continuar?`)) {
                  runBulk(() => closeAttendance(lessonId), (c) => `Asistencia cerrada: ${c} persona(s) quedaron como «No asistió».`);
                }
              }}
            >
              Cerrar asistencia
            </Button>
          </div>
        )}

        {notice && (
          <p
            role={notice.kind === "error" ? "alert" : "status"}
            className={`rounded-md border-l-4 px-3 py-2 text-sm ${
              notice.kind === "error" ? "border-red-600 bg-red-50 text-red-900" : "border-green-700 bg-green-50 text-green-900"
            }`}
          >
            {notice.text}
          </p>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 bg-white px-6 py-8 text-center text-sm text-zinc-600">
          Nadie coincide con los filtros.
        </p>
      ) : (
        <ul className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          {visible.map((row) => (
            <Row key={row.userId} row={row} status={marks[row.userId] ?? null} editable={canEdit} onSet={onSet} />
          ))}
        </ul>
      )}
      <p className="text-xs text-zinc-500">
        Mostrando {visible.length} de {rows.length} inscritos. Asistió y Justificada cuentan como sesión cumplida.
      </p>
    </div>
  );
}
