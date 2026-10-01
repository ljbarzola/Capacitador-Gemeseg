import type { Metadata } from "next";
import { Card, LinkButton, PageHeader } from "@/components/ui";
import { requireStaff } from "@/lib/dal";
import { getPrisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Administración · Capacitación Gemeseg" };

export default async function AdminHome() {
  const user = await requireStaff();
  const prisma = getPrisma();
  const [users, courses, published, enrollments, completed] = await Promise.all([
    prisma.user.count({ where: { active: true } }),
    prisma.course.count(),
    prisma.course.count({ where: { published: true } }),
    prisma.enrollment.count(),
    prisma.enrollment.count({ where: { status: "COMPLETED" } }),
  ]);

  const stats = [
    { label: "Usuarios activos", value: users },
    { label: "Cursos", value: `${published} publicados de ${courses}` },
    { label: "Inscripciones", value: enrollments },
    { label: "Cursos completados", value: completed },
  ];

  return (
    <>
      <PageHeader
        title="Administración"
        subtitle="Cree cursos, asigne capacitaciones y haga seguimiento."
        actions={<LinkButton href="/admin/cursos">Ir a cursos</LinkButton>}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <p className="text-sm text-zinc-600">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold text-navy">{stat.value}</p>
          </Card>
        ))}
      </div>
      {user.role === "ADMIN" && (
        <p className="mt-6 text-sm text-zinc-600">
          Como administrador también puede gestionar <a className="underline" href="/admin/usuarios">usuarios y roles</a>.
        </p>
      )}
    </>
  );
}
