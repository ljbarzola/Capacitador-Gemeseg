import type { OutlineItem } from "@/lib/progress";

export function itemHref(courseId: string, item: Pick<OutlineItem, "kind" | "id">) {
  return item.kind === "lesson"
    ? `/cursos/${courseId}/leccion/${item.id}`
    : `/cursos/${courseId}/examen/${item.id}`;
}
