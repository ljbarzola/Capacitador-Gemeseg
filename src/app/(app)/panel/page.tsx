import type { Metadata } from "next";
import { Badge, Card, Empty, LinkButton, PageHeader, ProgressBar } from "@/components/ui";
import { requireUser } from "@/lib/dal";
import { getPrisma } from "@/lib/prisma";
import { getOutline } from "@/lib/progress";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Mis cursos · Capacitación Gemeseg" };

export default async function PanelPage() {
  const user = await requireUser();

  const enrollments = await getPrisma().enrollment.findMany({
    where: { userId: user.id, course: { published: true } },
    orderBy: { assignedAt: "desc" },
    select: {
      id: true,
      status: true,
      dueAt: true,
      course: { select: { id: true, title: true, description: true } },
    },
  });
  const outlines = await Promise.all(enrollments.map((e) => getOutline(e.course.id, user.id)));

  return (
    <>
      <PageHeader
        title={`Hola, ${user.firstNames.split(" ")[0]}`}
        subtitle="Estos son los cursos que tiene asignados."
      />
      {enrollments.length === 0 ? (
        <Empty>Aún no tiene cursos asignados. Cuando se le asigne uno, aparecerá aquí.</Empty>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {enrollments.map((enrollment, index) => {
            const outline = outlines[index];
            const percent = outline?.percent ?? 0;
            const overdue =
              enrollment.dueAt && enrollment.status !== "COMPLETED" && enrollment.dueAt < new Date();
            return (
              <li key={enrollment.id}>
                <Card className="flex h-full flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-lg font-semibold text-navy">{enrollment.course.title}</h2>
                    {enrollment.status === "COMPLETED" ? (
                      <Badge tone="green">Completado</Badge>
                    ) : enrollment.status === "IN_PROGRESS" ? (
                      <Badge tone="blue">En curso</Badge>
                    ) : (
                      <Badge>Por iniciar</Badge>
                    )}
                  </div>
                  {enrollment.course.description && (
                    <p className="line-clamp-3 text-sm text-zinc-600">{enrollment.course.description}</p>
                  )}
                  <div className="mt-auto flex flex-col gap-2">
                    <ProgressBar percent={percent} />
                    <div className="flex items-center justify-between text-xs text-zinc-600">
                      <span>{percent}% completado</span>
                      {enrollment.dueAt && (
                        <span className={overdue ? "font-semibold text-red-700" : undefined}>
                          {overdue ? "Venció" : "Vence"} el {formatDate(enrollment.dueAt)}
                        </span>
                      )}
                    </div>
                    <LinkButton href={`/cursos/${enrollment.course.id}`} className="mt-1">
                      {enrollment.status === "COMPLETED"
                        ? "Revisar curso"
                        : percent > 0
                          ? "Continuar"
                          : "Comenzar"}
                    </LinkButton>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
