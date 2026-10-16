import { IconCheck, IconLock, IconQuiz, LessonIcon } from "@/components/icons";
import { itemHref } from "@/lib/course-links";
import { formatDateTime } from "@/lib/format";
import type { OutlineItem, OutlineModule } from "@/lib/progress";
import { ItemLink } from "./item-link";

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

// Submódulos y actividades de un módulo, como se listan en el índice del curso.
export function ModuleBlock({ courseId, module: block }: { courseId: string; module: OutlineModule }) {
  return (
    <>
      {block.submodules.map((submodule) => (
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
                    <ItemLink href={itemHref(courseId, item)}>{content}</ItemLink>
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
    </>
  );
}
