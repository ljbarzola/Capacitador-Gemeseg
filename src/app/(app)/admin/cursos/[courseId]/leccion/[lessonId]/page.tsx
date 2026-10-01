import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Flash, PageHeader } from "@/components/ui";
import { requireStaff } from "@/lib/dal";
import { first } from "@/lib/form";
import { getPrisma } from "@/lib/prisma";
import { toDateTimeParts } from "@/lib/sessions";
import { LessonForm } from "./lesson-form";

export const metadata: Metadata = { title: "Lección · Capacitación Gemeseg" };

// lessonId = "nueva" crea una lección en el submódulo indicado por ?submodulo=
export default async function LessonEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireStaff();
  const { courseId, lessonId } = await params;
  const query = await searchParams;
  const prisma = getPrisma();

  let initial = null;
  let submoduleId: string | undefined;

  if (lessonId === "nueva") {
    submoduleId = first(query.submodulo);
    const submodule = submoduleId
      ? await prisma.submodule.findFirst({ where: { id: submoduleId, module: { courseId } }, select: { id: true } })
      : null;
    if (!submodule) notFound();
  } else {
    const lesson = await prisma.lesson.findFirst({
      where: { id: lessonId, submodule: { module: { courseId } } },
      select: { id: true, title: true, type: true, body: true, url: true, storagePath: true, fileName: true, startsAt: true, instructorId: true },
    });
    if (!lesson) notFound();
    initial = lesson;
  }

  const instructors = await prisma.user.findMany({
    where: { active: true, role: { in: ["INSTRUCTOR", "ADMIN"] } },
    orderBy: [{ lastNames: "asc" }, { firstNames: "asc" }],
    select: { id: true, firstNames: true, lastNames: true },
  });
  const when = initial?.startsAt ? toDateTimeParts(initial.startsAt) : null;

  return (
    <>
      <PageHeader title={initial ? "Editar lección" : "Nueva lección"} />
      <Flash ok={query.ok} error={query.error} />
      <Card className="max-w-3xl">
        <LessonForm
          courseId={courseId}
          submoduleId={submoduleId}
          initial={
            initial
              ? {
                  id: initial.id,
                  title: initial.title,
                  type: initial.type,
                  body: initial.body,
                  url: initial.url,
                  storagePath: initial.storagePath,
                  fileName: initial.fileName,
                  sessionDate: when?.date ?? "",
                  sessionTime: when?.time ?? "",
                  instructorId: initial.instructorId ?? "",
                }
              : undefined
          }
          instructors={instructors.map((u) => ({ id: u.id, name: `${u.lastNames} ${u.firstNames}` }))}
        />
      </Card>
      <p className="mt-6 text-sm">
        <Link href={`/admin/cursos/${courseId}`} className="text-zinc-600 underline">
          ← Volver al curso
        </Link>
      </p>
    </>
  );
}
