import Link from "next/link";
import { itemHref } from "@/lib/course-links";
import type { Outline, OutlineItem } from "@/lib/progress";
import { ProgressBar } from "@/components/ui";

function Marker({ item }: { item: OutlineItem }) {
  if (item.done) {
    return (
      <span aria-label="Completado" className="flex size-5 shrink-0 items-center justify-center rounded-full bg-green-600 text-xs text-white">
        ✓
      </span>
    );
  }
  if (!item.accessible) {
    return (
      <span aria-label="Bloqueado" className="flex size-5 shrink-0 items-center justify-center text-xs">
        🔒
      </span>
    );
  }
  return <span aria-hidden className="size-5 shrink-0 rounded-full border-2 border-zinc-300" />;
}

export function CourseSidebar({
  outline,
  currentKey,
  preview,
}: {
  outline: Outline;
  currentKey?: string;
  preview: boolean;
}) {
  return (
    <nav aria-label="Contenido del curso" className="flex flex-col gap-4">
      <div>
        <Link href={`/cursos/${outline.course.id}`} className="font-semibold text-navy hover:underline">
          {outline.course.title}
        </Link>
        {!preview && (
          <div className="mt-2 flex flex-col gap-1">
            <ProgressBar percent={outline.percent} />
            <span className="text-xs text-zinc-600">
              {outline.completed} de {outline.total} completados
            </span>
          </div>
        )}
      </div>
      {outline.modules.map((module) => (
        <div key={module.id} className="flex flex-col gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-500">{module.title}</h3>
          {module.submodules.map((submodule) => (
            <div key={submodule.id} className="flex flex-col gap-1">
              <h4 className="text-sm font-semibold text-navy">{submodule.title}</h4>
              <ul className="flex flex-col">
                {submodule.items.map((item) => {
                  const current = item.key === currentKey;
                  const content = (
                    <>
                      <Marker item={item} />
                      <span className="text-sm">{item.title}</span>
                    </>
                  );
                  return (
                    <li key={item.key}>
                      {item.accessible ? (
                        <Link
                          href={itemHref(outline.course.id, item)}
                          aria-current={current ? "page" : undefined}
                          className={`flex items-start gap-2 rounded-lg px-2 py-1.5 ${
                            current ? "bg-brand/10 font-semibold text-navy" : "text-zinc-700 hover:bg-zinc-100"
                          }`}
                        >
                          {content}
                        </Link>
                      ) : (
                        <span className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-zinc-400">
                          {content}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      ))}
    </nav>
  );
}
