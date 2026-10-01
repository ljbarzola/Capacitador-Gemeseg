import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/confirm-button";
import { Badge, Button, Card, Field, Flash, Input, LinkButton, PageHeader, Select, Textarea } from "@/components/ui";
import { requireStaff } from "@/lib/dal";
import { getPrisma } from "@/lib/prisma";
import {
  addModule,
  addSubmodule,
  deleteCourse,
  deleteLesson,
  deleteModule,
  deleteSubmodule,
  moveItem,
  updateCourse,
  updateModule,
  updateSubmodule,
} from "../actions";

export const metadata: Metadata = { title: "Editar curso · Capacitación Gemeseg" };

const TYPE_LABEL = {
  TEXT: "Texto",
  VIDEO_EMBED: "Video (YouTube/Vimeo)",
  VIDEO_UPLOAD: "Video subido",
  IMAGE: "Imagen",
  LINK: "Enlace",
  FILE: "Archivo",
} as const;

function MoveButtons({ kind, id, courseId }: { kind: string; id: string; courseId: string }) {
  return (
    <div className="flex gap-1">
      {(["up", "down"] as const).map((direction) => (
        <form key={direction} action={moveItem}>
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="direction" value={direction} />
          <Button
            type="submit"
            variant="ghost"
            className="px-2 py-1"
            aria-label={direction === "up" ? "Subir" : "Bajar"}
            title={direction === "up" ? "Subir" : "Bajar"}
          >
            {direction === "up" ? "↑" : "↓"}
          </Button>
        </form>
      ))}
    </div>
  );
}

export default async function CourseEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireStaff();
  const { courseId } = await params;
  const query = await searchParams;

  const course = await getPrisma().course.findUnique({
    where: { id: courseId },
    include: {
      _count: { select: { enrollments: true } },
      modules: {
        orderBy: [{ order: "asc" }, { id: "asc" }],
        include: {
          submodules: {
            orderBy: [{ order: "asc" }, { id: "asc" }],
            include: {
              lessons: {
                orderBy: [{ order: "asc" }, { id: "asc" }],
                select: { id: true, title: true, type: true },
              },
              quiz: { select: { id: true, _count: { select: { questions: true } } } },
            },
          },
        },
      },
    },
  });
  if (!course) notFound();

  return (
    <>
      <PageHeader
        title={course.title}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {course.published ? <Badge tone="green">Publicado</Badge> : <Badge tone="amber">Borrador</Badge>}
            <span>{course._count.enrollments} inscrito(s)</span>
          </span>
        }
        actions={
          <>
            <LinkButton href={`/admin/cursos/${course.id}/asignar`} variant="secondary">
              Asignar
            </LinkButton>
            <LinkButton href={`/cursos/${course.id}`} variant="secondary">
              Vista previa
            </LinkButton>
          </>
        }
      />
      <Flash ok={query.ok} error={query.error} />

      <Card className="mb-6">
        <h2 className="mb-4 text-lg font-semibold text-navy">Datos del curso</h2>
        <form action={updateCourse} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={course.id} />
          <Field label="Título" className="sm:col-span-2">
            <Input name="title" defaultValue={course.title} required maxLength={150} />
          </Field>
          <Field label="Descripción" className="sm:col-span-2">
            <Textarea name="description" defaultValue={course.description ?? ""} rows={3} maxLength={4000} />
          </Field>
          <Field
            label="Progresión"
            hint="Secuencial: cada actividad se desbloquea al completar la anterior. Libre: el estudiante elige el orden."
          >
            <Select name="progression" defaultValue={course.progression}>
              <option value="FREE">Libre</option>
              <option value="SEQUENTIAL">Secuencial (en orden)</option>
            </Select>
          </Field>
          <Field label="Vigencia del certificado (meses)" hint="12 por defecto. Déjelo vacío si el certificado no debe vencer.">
            <Input name="recertMonths" type="number" min={1} max={120} defaultValue={course.recertMonths ?? ""} />
          </Field>
          <label className="flex items-center gap-2 text-sm font-medium text-navy sm:col-span-2">
            <input type="checkbox" name="published" defaultChecked={course.published} className="size-4 accent-[#ee3b1b]" />
            Publicado (visible para las personas inscritas)
          </label>
          <div className="sm:col-span-2">
            <Button type="submit">Guardar datos</Button>
          </div>
        </form>
      </Card>

      <h2 className="mb-3 text-lg font-semibold text-navy">Contenido</h2>
      <div className="flex flex-col gap-4">
        {course.modules.length === 0 && (
          <p className="text-sm text-zinc-600">Empiece agregando un módulo.</p>
        )}
        {course.modules.map((module, moduleIndex) => (
          <Card key={module.id} className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-zinc-500">Módulo {moduleIndex + 1}</span>
              <form action={updateModule} className="flex min-w-56 flex-1 items-center gap-2">
                <input type="hidden" name="id" value={module.id} />
                <input type="hidden" name="courseId" value={course.id} />
                <Input name="title" defaultValue={module.title} required maxLength={150} aria-label="Título del módulo" />
                <Button type="submit" variant="secondary">
                  Guardar
                </Button>
              </form>
              <MoveButtons kind="module" id={module.id} courseId={course.id} />
              <form action={deleteModule}>
                <input type="hidden" name="id" value={module.id} />
                <input type="hidden" name="courseId" value={course.id} />
                <ConfirmButton
                  variant="danger"
                  message={`¿Eliminar el módulo "${module.title}" con todo su contenido? No se puede deshacer.`}
                >
                  Eliminar
                </ConfirmButton>
              </form>
            </div>

            {module.submodules.map((submodule, submoduleIndex) => (
              <div key={submodule.id} className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-zinc-500">
                    Submódulo {submoduleIndex + 1}
                  </span>
                  <form action={updateSubmodule} className="flex min-w-56 flex-1 items-center gap-2">
                    <input type="hidden" name="id" value={submodule.id} />
                    <input type="hidden" name="courseId" value={course.id} />
                    <Input name="title" defaultValue={submodule.title} required maxLength={150} aria-label="Título del submódulo" />
                    <Button type="submit" variant="secondary">
                      Guardar
                    </Button>
                  </form>
                  <MoveButtons kind="submodule" id={submodule.id} courseId={course.id} />
                  <form action={deleteSubmodule}>
                    <input type="hidden" name="id" value={submodule.id} />
                    <input type="hidden" name="courseId" value={course.id} />
                    <ConfirmButton
                      variant="danger"
                      message={`¿Eliminar el submódulo "${submodule.title}" con sus lecciones y examen?`}
                    >
                      Eliminar
                    </ConfirmButton>
                  </form>
                </div>

                <ul className="flex flex-col gap-2">
                  {submodule.lessons.map((lesson) => (
                    <li
                      key={lesson.id}
                      className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2"
                    >
                      <span className="min-w-40 flex-1 text-sm font-medium text-navy">{lesson.title}</span>
                      <Badge>{TYPE_LABEL[lesson.type]}</Badge>
                      <MoveButtons kind="lesson" id={lesson.id} courseId={course.id} />
                      <LinkButton href={`/admin/cursos/${course.id}/leccion/${lesson.id}`} variant="secondary">
                        Editar
                      </LinkButton>
                      <form action={deleteLesson}>
                        <input type="hidden" name="id" value={lesson.id} />
                        <input type="hidden" name="courseId" value={course.id} />
                        <ConfirmButton variant="danger" message={`¿Eliminar la lección "${lesson.title}"?`}>
                          Eliminar
                        </ConfirmButton>
                      </form>
                    </li>
                  ))}
                  {submodule.lessons.length === 0 && <li className="text-sm text-zinc-500">Sin lecciones todavía.</li>}
                </ul>

                <div className="flex flex-wrap items-center gap-2">
                  <LinkButton
                    href={`/admin/cursos/${course.id}/leccion/nueva?submodulo=${submodule.id}`}
                    variant="secondary"
                  >
                    + Agregar lección
                  </LinkButton>
                  <LinkButton href={`/admin/cursos/${course.id}/examen/${submodule.id}`} variant="secondary">
                    {submodule.quiz
                      ? `Examen (${submodule.quiz._count.questions} pregunta(s))`
                      : "+ Crear examen"}
                  </LinkButton>
                </div>
              </div>
            ))}

            <form action={addSubmodule} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="moduleId" value={module.id} />
              <input type="hidden" name="courseId" value={course.id} />
              <Input
                name="title"
                required
                maxLength={150}
                placeholder="Título del nuevo submódulo"
                aria-label="Título del nuevo submódulo"
                className="max-w-sm"
              />
              <Button type="submit" variant="secondary">
                + Agregar submódulo
              </Button>
            </form>
          </Card>
        ))}

        <Card>
          <form action={addModule} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="courseId" value={course.id} />
            <Input
              name="title"
              required
              maxLength={150}
              placeholder="Título del nuevo módulo"
              aria-label="Título del nuevo módulo"
              className="max-w-sm"
            />
            <Button type="submit">+ Agregar módulo</Button>
          </form>
        </Card>
      </div>

      <Card className="mt-10 border-red-200">
        <h2 className="text-lg font-semibold text-red-800">Zona de peligro</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Eliminar el curso borra su contenido, los exámenes y el avance de todas las personas inscritas.
        </p>
        <form action={deleteCourse} className="mt-3">
          <input type="hidden" name="id" value={course.id} />
          <ConfirmButton
            variant="danger"
            message={`¿Eliminar el curso "${course.title}" y todo su avance? No se puede deshacer.`}
          >
            Eliminar curso
          </ConfirmButton>
        </form>
      </Card>
      <p className="mt-6 text-sm">
        <Link href="/admin/cursos" className="text-zinc-600 underline">
          ← Volver a cursos
        </Link>
      </p>
    </>
  );
}
