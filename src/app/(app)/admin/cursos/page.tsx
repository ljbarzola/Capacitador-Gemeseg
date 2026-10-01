import type { Metadata } from "next";
import { IconBook } from "@/components/icons";
import { Badge, Button, Card, Empty, Flash, IconChip, Input, LinkButton, PageHeader, accentFor } from "@/components/ui";
import { getCourseAccents } from "@/lib/accents";
import { requireStaff } from "@/lib/dal";
import { getPrisma } from "@/lib/prisma";
import { createCourse } from "./actions";

export const metadata: Metadata = { title: "Cursos · Capacitación Gemeseg" };

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireStaff();
  const query = await searchParams;
  const courses = await getPrisma().course.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      published: true,
      progression: true,
      _count: { select: { modules: true, enrollments: true } },
    },
  });

  const accents = await getCourseAccents();

  return (
    <>
      <PageHeader title="Cursos" subtitle="Cree y organice los cursos de capacitación." />
      <Flash ok={query.ok} error={query.error} />
      <Card className="mb-6">
        <form action={createCourse} className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-60 flex-1 flex-col gap-1 text-sm font-medium text-navy">
            Nuevo curso
            <Input name="title" required maxLength={150} placeholder="Ej.: Prevención de riesgos para guardias" />
          </label>
          <Button type="submit">Crear curso</Button>
        </form>
      </Card>

      {courses.length === 0 ? (
        <Empty>Aún no hay cursos. Cree el primero con el formulario de arriba.</Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {courses.map((course) => (
            <li key={course.id}>
              <Card interactive accent={accents.get(course.id) ?? accentFor(course.id)} className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <IconChip accent={accents.get(course.id) ?? accentFor(course.id)}>
                    <IconBook />
                  </IconChip>
                  <div className="min-w-0">
                  <p className="font-semibold text-navy">{course.title}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                    {course.published ? <Badge tone="green">Publicado</Badge> : <Badge tone="amber">Borrador</Badge>}
                    <span>{course._count.modules} módulo(s)</span>
                    <span>·</span>
                    <span>{course._count.enrollments} inscrito(s)</span>
                    <span>·</span>
                    <span>{course.progression === "SEQUENTIAL" ? "Secuencial" : "Libre"}</span>
                  </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <LinkButton href={`/admin/cursos/${course.id}`} variant="secondary">
                    Editar
                  </LinkButton>
                  <LinkButton href={`/admin/cursos/${course.id}/asignar`} variant="secondary">
                    Asignar
                  </LinkButton>
                  <LinkButton href={`/cursos/${course.id}`} variant="ghost">
                    Vista previa
                  </LinkButton>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
