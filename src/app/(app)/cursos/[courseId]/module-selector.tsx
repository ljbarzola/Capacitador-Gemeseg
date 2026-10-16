"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { Select } from "@/components/ui";
import { itemHref } from "@/lib/course-links";
import type { OutlineModule } from "@/lib/progress";
import { FinishModuleForm } from "./finish-module-form";
import { ModuleBlock } from "./module-block";

// Lista desplegable de módulos del índice del curso. Debajo se muestra solo el contenido del módulo
// elegido. Un módulo finalizado se puede volver a abrir para repasar; uno pendiente aparece con candado
// y no se puede elegir. En vista previa (personal) no hay estados ni candados y nada se guarda.
// Al entrar queda en el módulo actual; si se abre una actividad de otro módulo, la lista la sigue.
export function ModuleSelector({
  courseId,
  modules,
  currentModuleId,
  lastModuleId,
  preview,
}: {
  courseId: string;
  modules: OutlineModule[];
  currentModuleId: string | null;
  lastModuleId: string | undefined;
  preview: boolean;
}) {
  const pathname = usePathname();
  const fromPath = modules.find((m) =>
    m.submodules.some((s) => s.items.some((i) => itemHref(courseId, i) === pathname)),
  )?.id;
  const initial = fromPath ?? currentModuleId ?? modules[0]?.id ?? "";
  const [state, setState] = useState({ path: pathname, current: currentModuleId, picked: initial });
  // Cambia de página (otra actividad) o de módulo actual (p. ej. tras «Finalizar módulo»): la lista
  // se recoloca sola; si no, conserva lo que la persona eligió.
  if (state.path !== pathname || state.current !== currentModuleId) {
    setState({ path: pathname, current: currentModuleId, picked: fromPath ?? currentModuleId ?? state.picked });
  }

  const requested = modules.find((m) => m.id === state.picked);
  const selected = requested && !requested.locked ? requested : (modules.find((m) => m.id === currentModuleId) ?? modules[0]);
  if (!selected) return null;

  const stateOf = (m: OutlineModule) => (m.locked ? "bloqueado" : m.finalized ? "finalizado" : "en curso");
  const mark = (m: OutlineModule) => (m.locked ? "🔒" : m.finalized ? "✓" : "●");
  const canFinish = !preview && selected.id === currentModuleId && selected.ready && !selected.finalized;

  return (
    <div className="flex flex-col gap-3 border-t border-zinc-200 pt-4">
      <label className="flex flex-col gap-1.5 text-xs font-medium text-zinc-600">
        Módulo
        <Select value={selected.id} onChange={(event) => setState({ ...state, picked: event.target.value })}>
          {modules.map((m, index) => (
            <option key={m.id} value={m.id} disabled={m.locked}>
              {preview ? "" : `${mark(m)} `}
              {index + 1}. {m.title}
              {preview ? "" : ` (${stateOf(m)})`}
            </option>
          ))}
        </Select>
      </label>

      {!preview && selected.finalized && (
        <p className="text-xs text-zinc-600">Módulo finalizado: puede volver a abrirlo para repasar.</p>
      )}

      <ModuleBlock courseId={courseId} module={selected} />

      {canFinish && (
        <div className="mt-1 flex flex-col gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
          <p className="text-sm text-green-950">Terminó todas las actividades de este módulo.</p>
          <FinishModuleForm
            courseId={courseId}
            moduleId={selected.id}
            last={lastModuleId === selected.id}
            issuesCertificate={selected.issuesCertificate}
          />
        </div>
      )}
    </div>
  );
}
