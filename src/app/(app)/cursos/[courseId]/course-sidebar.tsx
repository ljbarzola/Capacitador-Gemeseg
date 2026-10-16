import Link from "next/link";
import { IconCheck } from "@/components/icons";
import { SegmentProgress } from "@/components/ui";
import type { Outline } from "@/lib/progress";
import { FinishModuleForm } from "./finish-module-form";
import { ModuleBlock } from "./module-block";
import { PreviewModules } from "./preview-modules";

// Índice del curso. La persona ve solo su módulo actual (o todos, si ya completó el curso y repasa);
// el personal en vista previa elige el módulo con un selector.
export function CourseSidebar({
  outline,
  preview,
}: {
  outline: Outline;
  preview: boolean;
}) {
  const withItems = outline.modules.filter((m) => !m.empty);
  const shown = withItems.filter((m) => m.visible);

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

      {preview ? (
        <PreviewModules courseId={outline.course.id} modules={withItems} />
      ) : (
        shown.map((module) => {
          const number = withItems.findIndex((m) => m.id === module.id) + 1;
          return (
            <div key={module.id} className="flex flex-col gap-2.5 border-t border-zinc-200 pt-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Módulo {number} de {withItems.length}
                </p>
                <h3 className="mt-0.5 flex items-start gap-2 text-[0.95rem] leading-snug text-navy">
                  {module.title}
                  {module.finalized && (
                    <span
                      role="img"
                      aria-label="Módulo finalizado"
                      className="mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full bg-green-700 text-white"
                    >
                      <IconCheck width={12} height={12} strokeWidth={2.4} />
                    </span>
                  )}
                </h3>
              </div>
              <ModuleBlock courseId={outline.course.id} module={module} />
              {module.ready && !module.finalized && module.id === outline.currentModuleId && (
                <div className="mt-1 flex flex-col gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
                  <p className="text-sm text-green-950">Terminó todas las actividades de este módulo.</p>
                  <FinishModuleForm
                    courseId={outline.course.id}
                    moduleId={module.id}
                    last={withItems[withItems.length - 1]?.id === module.id}
                    issuesCertificate={module.issuesCertificate}
                  />
                </div>
              )}
            </div>
          );
        })
      )}
    </nav>
  );
}
