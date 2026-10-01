import Link from "next/link";
import { IconCheck, IconLock, IconQuiz, LessonIcon } from "@/components/icons";
import { SegmentProgress } from "@/components/ui";
import { itemHref } from "@/lib/course-links";
import { formatDateTime } from "@/lib/format";
import { ItemLink } from "./item-link";
import type { Outline, OutlineItem } from "@/lib/progress";

function Marker({ item }: { item: OutlineItem }) {
  if (item.done) {
    return (
      <span
        role="img"
        aria-label="Completado"
        className="mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full bg-green-700 text-white"
      >
        <IconCheck width={12} height={12} strokeWidth={2.4} />
      </span>
    );
  }
  if (!item.accessible) {
    return (
      <span role="img" aria-label="Bloqueado" className="mt-0.5 flex size-[18px] shrink-0 items-center justify-center text-zinc-400">
        <IconLock width={15} height={15} />
      </span>
    );
  }
  return (
    <span aria-hidden className="mt-0.5 flex size-[18px] shrink-0 items-center justify-center text-zinc-500">
      {item.kind === "quiz" ? <IconQuiz width={15} height={15} /> : <LessonIcon type={item.lessonType} width={15} height={15} />}
    </span>
  );
}

export function CourseSidebar({
  outline,
  preview,
}: {
  outline: Outline;
  preview: boolean;
}) {
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
      {outline.modules.map((module) => (
        <div key={module.id} className="flex flex-col gap-2.5 border-t border-zinc-200 pt-4">
          <h3 className="text-[0.95rem] leading-snug text-navy">{module.title}</h3>
          {module.submodules.map((submodule) => (
            <div key={submodule.id} className="flex flex-col gap-0.5">
              <h4 className="mb-0.5 text-xs font-medium text-zinc-500">{submodule.title}</h4>
              <ul className="flex flex-col">
                {submodule.items.map((item) => {
                  const content = (
                    <>
                      <Marker item={item} />
                      <span className="text-sm leading-snug">
                        {item.title}
                        {item.startsAt && <span className="block text-xs font-normal text-zinc-500">{formatDateTime(item.startsAt)}</span>}
                      </span>
                    </>
                  );
                  return (
                    <li key={item.key}>
                      {item.accessible ? (
                        <ItemLink href={itemHref(outline.course.id, item)}>{content}</ItemLink>
                      ) : (
                        <span className="flex items-start gap-2.5 rounded-md border-l-2 border-transparent px-2 py-1.5 text-zinc-400">
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
