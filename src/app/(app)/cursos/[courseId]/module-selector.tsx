"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { IconCheck, IconLock } from "@/components/icons";
import { itemHref } from "@/lib/course-links";
import type { OutlineModule } from "@/lib/progress";
import { FinishModuleForm } from "./finish-module-form";
import { ModuleBlock } from "./module-block";

// Módulos del índice del curso como acordeón: solo uno desplegado a la vez (con sus submódulos y
// lecciones); al abrir otro, el anterior se pliega. Un módulo finalizado se puede volver a abrir para
// repasar; uno pendiente aparece con candado y no se abre. En vista previa (personal) no hay estados
// ni candados y nada se guarda. Al entrar queda abierto el módulo actual; si se abre una actividad de
// otro módulo, el acordeón la sigue.
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
  const [state, setState] = useState({ path: pathname, current: currentModuleId, open: initial });
  // Cambia de página (otra actividad) o de módulo actual (p. ej. tras «Finalizar módulo»): el acordeón
  // se recoloca solo; si no, conserva lo que la persona abrió (o cerró).
  if (state.path !== pathname || state.current !== currentModuleId) {
    setState({ path: pathname, current: currentModuleId, open: fromPath ?? currentModuleId ?? state.open });
  }

  const stateOf = (m: OutlineModule) => (m.locked ? "bloqueado" : m.finalized ? "finalizado" : "en curso");

  return (
    <div className="flex flex-col gap-2 border-t border-zinc-200 pt-4">
      {modules.map((m, index) => {
        const open = state.open === m.id && !m.locked;
        const panelId = `module-panel-${m.id}`;
        const canFinish = !preview && m.id === currentModuleId && m.ready && !m.finalized;
        return (
          <section key={m.id} className="rounded-xl border border-zinc-200">
            <h3 className="text-[0.95rem] leading-snug">
              <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                disabled={m.locked}
                onClick={() => setState({ ...state, open: open ? "" : m.id })}
                className="flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left text-navy enabled:hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-400"
              >
                {!preview && (
                  <span
                    role="img"
                    aria-label={stateOf(m)}
                    className={`mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full ${
                      m.finalized ? "bg-green-700 text-white" : m.locked ? "text-zinc-400" : "border-2 border-orange-500"
                    }`}
                  >
                    {m.finalized && <IconCheck width={12} height={12} strokeWidth={2.4} />}
                    {m.locked && <IconLock width={15} height={15} />}
                  </span>
                )}
                <span className="flex-1">
                  <span className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Módulo {index + 1} de {modules.length}
                    {!preview && ` · ${stateOf(m)}`}
                  </span>
                  <span className="font-medium">{m.title}</span>
                </span>
                <span aria-hidden className={`mt-1 text-xs transition-transform ${open ? "rotate-180" : ""}`}>
                  ▾
                </span>
              </button>
            </h3>

            {open && (
              <div id={panelId} className="flex flex-col gap-3 border-t border-zinc-200 px-3 pb-3 pt-3">
                {!preview && m.finalized && (
                  <p className="text-xs text-zinc-600">Módulo finalizado: puede volver a abrirlo para repasar.</p>
                )}

                <ModuleBlock courseId={courseId} module={m} />

                {canFinish && (
                  <div className="flex flex-col gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
                    <p className="text-sm text-green-950">Terminó todas las actividades de este módulo.</p>
                    <FinishModuleForm
                      courseId={courseId}
                      moduleId={m.id}
                      last={lastModuleId === m.id}
                      issuesCertificate={m.issuesCertificate}
                    />
                  </div>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
