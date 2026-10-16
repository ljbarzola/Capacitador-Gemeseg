import Link from "next/link";
import { SegmentProgress } from "@/components/ui";
import type { Outline } from "@/lib/progress";
import { ModuleSelector } from "./module-selector";

// Índice del curso: título, avance y una lista desplegable de módulos (ver ModuleSelector).
export function CourseSidebar({
  outline,
  preview,
}: {
  outline: Outline;
  preview: boolean;
}) {
  const withItems = outline.modules.filter((m) => !m.empty);

  return (
    <nav aria-label="Contenido del curso" className="flex flex-col gap-5">
      <div>
        <Link href={`/cursos/${outline.course.id}`} className="text-[1.05rem] font-semibold leading-snug text-navy hover:underline">
          {outline.course.title}
        </Link>
        {!preview && (
          <div className="mt-3">
            <SegmentProgress completed={outline.completed} total={outline.total} />
            <span className="mt-1.5 block text-xs text-zinc-600">
              {outline.completed} de {outline.total} actividades completadas
            </span>
          </div>
        )}
      </div>

      <ModuleSelector
        courseId={outline.course.id}
        modules={withItems}
        currentModuleId={outline.currentModuleId}
        lastModuleId={withItems.at(-1)?.id}
        preview={preview}
      />
    </nav>
  );
}
