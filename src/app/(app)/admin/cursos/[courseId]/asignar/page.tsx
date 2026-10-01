import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/confirm-button";
import { Badge, Button, Card, Field, Flash, Input, LinkButton, PageHeader, ProgressBar, Select } from "@/components/ui";
import { requireStaff } from "@/lib/dal";
import { formatDate } from "@/lib/format";
import { first } from "@/lib/form";
import { getPrisma } from "@/lib/prisma";
import { getProgressForEnrollments } from "@/lib/progress";
import { assignBulk, assignPeople, removeEnrollment } from "./actions";

export const metadata: Metadata = { title: "Asignar curso · Capacitación Gemeseg" };

const PAGE_SIZE = 50;
const STATUS = {
  ASSIGNED: { label: "Por iniciar", tone: "gray" },
  IN_PROGRESS: { label: "En curso", tone: "blue" },
  COMPLETED: { label: "Completado", tone: "green" },
} as const;

export default async function AssignPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireStaff();
  const { courseId } = await params;
  const query = await searchParams;
  const q = first(query.q)?.trim() ?? "";
  const pageNumber = Math.max(1, Number(first(query.pagina)) || 1);
  const prisma = getPrisma();

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, title: true, published: true },
  });
  if (!course) notFound();

  const [groups, candidates, enrollments, enrolledCount] = await Promise.all([
    prisma.group.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, _count: { select: { users: { where: { active: true, role: "STUDENT" } } } } },
    }),
    q
      ? prisma.user.findMany({
          where: {
            active: true,
            enrollments: { none: { courseId } },
            OR: [
              { firstNames: { contains: q, mode: "insensitive" } },
              { lastNames: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { cedula: { contains: q } },
            ],
          },
          orderBy: [{ lastNames: "asc" }, { firstNames: "asc" }],
          take: 50,
          select: { id: true, firstNames: true, lastNames: true, email: true, group: { select: { name: true } } },
        })
      : Promise.resolve([]),
    prisma.enrollment.findMany({
      where: { courseId },
      orderBy: { assignedAt: "desc" },
      skip: (pageNumber - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        status: true,
        dueAt: true,
        assignedAt: true,
        cycleStartedAt: true,
        user: { select: { id: true, firstNames: true, lastNames: true, email: true, group: { select: { name: true } } } },
      },
    }),
    prisma.enrollment.count({ where: { courseId } }),
  ]);
  const progress = await getProgressForEnrollments(
    courseId,
    enrollments.map((e) => ({ userId: e.user.id, cycleStartedAt: e.cycleStartedAt })),
  );
  const students = await prisma.user.count({ where: { active: true, role: "STUDENT" } });
  const pages = Math.max(1, Math.ceil(enrolledCount / PAGE_SIZE));
  const base = `/admin/cursos/${courseId}/asignar`;

  return (
    <>
      <PageHeader
        title={`Asignar: ${course.title}`}
        subtitle={
          course.published
            ? "Las personas asignadas verán el curso en «Mis cursos»."
            : "Este curso está en borrador: las personas no lo verán hasta que lo publique."
        }
        actions={
          <LinkButton href={`/admin/cursos/${courseId}`} variant="secondary">
            Editar curso
          </LinkButton>
        }
      />
      <Flash ok={query.ok} error={query.error} n={query.n} />

      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-1 text-lg font-semibold text-navy">Asignación masiva</h2>
          <p className="mb-4 text-sm text-zinc-600">
            A todos los estudiantes activos o a un grupo. Quien ya esté inscrito no se duplica ni pierde su avance.
          </p>
          <form action={assignBulk} className="grid gap-3">
            <input type="hidden" name="courseId" value={courseId} />
            <Field label="Destinatarios">
              <Select name="target" defaultValue="" required>
                <option value="" disabled>
                  Elija…
                </option>
                <option value="ALL">Todos los estudiantes activos ({students})</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    Grupo: {g.name} ({g._count.users})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Fecha límite (opcional)">
              <Input name="dueAt" type="date" />
            </Field>
            <div>
              <ConfirmButton message="¿Asignar este curso a todas las personas seleccionadas?">Asignar</ConfirmButton>
            </div>
          </form>
        </Card>

        <Card>
          <h2 className="mb-1 text-lg font-semibold text-navy">Asignar a personas</h2>
          <form action={base} className="mb-4 flex gap-2">
            <Input name="q" defaultValue={q} placeholder="Buscar por nombre, correo o cédula" aria-label="Buscar personas" />
            <Button type="submit" variant="secondary">
              Buscar
            </Button>
          </form>
          {q && candidates.length === 0 && (
            <p className="text-sm text-zinc-600">Nadie coincide (o ya están inscritas en este curso).</p>
          )}
          {candidates.length > 0 && (
            <form action={assignPeople} className="grid gap-3">
              <input type="hidden" name="courseId" value={courseId} />
              <ul className="max-h-64 divide-y divide-zinc-100 overflow-y-auto rounded-lg border border-zinc-200">
                {candidates.map((user) => (
                  <li key={user.id}>
                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-zinc-50">
                      <input type="checkbox" name="userId" value={user.id} className="size-4 accent-[#ee3b1b]" />
                      <span className="min-w-0 text-sm">
                        <span className="block truncate font-medium text-navy">
                          {user.lastNames} {user.firstNames}
                        </span>
                        <span className="block truncate text-xs text-zinc-600">
                          {user.email}
                          {user.group && ` · ${user.group.name}`}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <Field label="Fecha límite (opcional)">
                <Input name="dueAt" type="date" />
              </Field>
              <div>
                <Button type="submit">Asignar a las personas marcadas</Button>
              </div>
            </form>
          )}
          {!q && <p className="text-sm text-zinc-600">Busque a las personas para marcarlas y asignarles el curso.</p>}
        </Card>
      </div>

      <h2 className="mb-3 text-lg font-semibold text-navy">Inscritos ({enrolledCount})</h2>
      {enrollments.length === 0 ? (
        <p className="text-sm text-zinc-600">Nadie está inscrito todavía.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {enrollments.map((enrollment) => {
            const p = progress.get(enrollment.user.id);
            const overdue = enrollment.dueAt && enrollment.status !== "COMPLETED" && enrollment.dueAt < new Date();
            return (
              <li key={enrollment.id}>
                <Card className="grid items-center gap-3 md:grid-cols-[1.5fr_1fr_auto]">
                  <div className="min-w-0">
                    <Link
                      href={`/avance/personas/${enrollment.user.id}`}
                      className="block truncate font-semibold text-navy underline-offset-2 hover:underline"
                    >
                      {enrollment.user.lastNames} {enrollment.user.firstNames}
                    </Link>
                    <p className="truncate text-xs text-zinc-600">
                      {enrollment.user.email}
                      {enrollment.user.group && ` · ${enrollment.user.group.name}`}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Asignado el {formatDate(enrollment.assignedAt)}
                      {enrollment.dueAt && (
                        <span className={overdue ? "font-semibold text-red-700" : undefined}>
                          {" "}
                          · {overdue ? "Venció" : "Vence"} el {formatDate(enrollment.dueAt)}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Badge tone={STATUS[enrollment.status].tone}>{STATUS[enrollment.status].label}</Badge>
                      <span className="text-xs text-zinc-600">{p?.percent ?? 0}%</span>
                    </div>
                    <ProgressBar percent={p?.percent ?? 0} />
                  </div>
                  <form action={removeEnrollment}>
                    <input type="hidden" name="id" value={enrollment.id} />
                    <input type="hidden" name="courseId" value={courseId} />
                    <ConfirmButton
                      variant="danger"
                      message="¿Quitar la inscripción? Se borra su avance en este curso."
                    >
                      Quitar
                    </ConfirmButton>
                  </form>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
      {pages > 1 && (
        <nav aria-label="Paginación" className="mt-6 flex items-center justify-center gap-3 text-sm">
          {pageNumber > 1 && (
            <LinkButton href={`${base}?pagina=${pageNumber - 1}`} variant="secondary">
              ← Anterior
            </LinkButton>
          )}
          <span className="text-zinc-600">
            Página {pageNumber} de {pages}
          </span>
          {pageNumber < pages && (
            <LinkButton href={`${base}?pagina=${pageNumber + 1}`} variant="secondary">
              Siguiente →
            </LinkButton>
          )}
        </nav>
      )}
      <p className="mt-6 text-sm">
        <Link href="/admin/cursos" className="text-zinc-600 underline">
          ← Volver a cursos
        </Link>
      </p>
    </>
  );
}
