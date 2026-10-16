"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { Select } from "@/components/ui";
import { itemHref } from "@/lib/course-links";
import type { OutlineModule } from "@/lib/progress";
import { ModuleBlock } from "./module-block";

// Vista previa del personal: un selector para ver cualquier módulo libremente (nada se guarda).
// Si se abre una actividad de otro módulo (p. ej. con «Anterior»), el selector la sigue.
export function PreviewModules({ courseId, modules }: { courseId: string; modules: OutlineModule[] }) {
  const pathname = usePathname();
  const fromPath = modules.find((m) =>
    m.submodules.some((s) => s.items.some((i) => itemHref(courseId, i) === pathname)),
  )?.id;
  const [state, setState] = useState({ path: pathname, picked: fromPath ?? modules[0]?.id ?? "" });
  if (state.path !== pathname) setState({ path: pathname, picked: fromPath ?? state.picked });

  const selected = modules.find((m) => m.id === state.picked) ?? modules[0];
  if (!selected) return null;

  return (
    <div className="flex flex-col gap-3 border-t border-zinc-200 pt-4">
      <label className="flex flex-col gap-1.5 text-xs font-medium text-zinc-600">
        Módulo (vista previa)
        <Select value={selected.id} onChange={(event) => setState({ path: pathname, picked: event.target.value })}>
          {modules.map((m, index) => (
            <option key={m.id} value={m.id}>
              {index + 1}. {m.title}
            </option>
          ))}
        </Select>
      </label>
      <ModuleBlock courseId={courseId} module={selected} />
    </div>
  );
}
