import "server-only";
import { cache } from "react";
import { ACCENTS, type Accent } from "@/components/ui";
import { getPrisma } from "@/lib/prisma";

// Color de identidad de cada curso: se reparte por orden de creación para que cursos vecinos
// tengan colores distintos, y es el mismo en «Mis cursos», en el curso y en la administración.
export const getCourseAccents = cache(async (): Promise<Map<string, Accent>> => {
  const courses = await getPrisma().course.findMany({ orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { id: true } });
  return new Map(courses.map((c, i) => [c.id, ACCENTS[i % ACCENTS.length]]));
});
