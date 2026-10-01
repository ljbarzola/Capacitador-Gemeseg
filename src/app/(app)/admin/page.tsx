import type { Metadata } from "next";
import Link from "next/link";
import {
  IconAward,
  IconBook,
  IconChart,
  IconCheck,
  IconList,
  IconPlus,
  IconSliders,
  IconUpload,
  IconUsers,
} from "@/components/icons";
import { Card, IconChip, PageHeader, Stat, ACCENTS } from "@/components/ui";
import { requireStaff } from "@/lib/dal";
import { getPrisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Administración · Capacitación Gemeseg" };

const [naranja, turquesa, indigo, ambar, esmeralda] = ACCENTS;

export default async function AdminHome() {
  const user = await requireStaff();
  const prisma = getPrisma();
  const [users, courses, published, enrollments, completed, certs] = await Promise.all([
    prisma.user.count({ where: { active: true } }),
    prisma.course.count(),
    prisma.course.count({ where: { published: true } }),
    prisma.enrollment.count(),
    prisma.enrollment.count({ where: { status: "COMPLETED" } }),
    prisma.certificate.count(),
  ]);

  const stats = [
    { label: "Usuarios activos", value: users, note: "con acceso a la plataforma", accent: indigo, icon: <IconUsers /> },
    { label: "Cursos", value: courses, note: `${published} publicado(s), ${courses - published} en borrador`, accent: turquesa, icon: <IconBook /> },
    { label: "Inscripciones", value: enrollments, note: `${completed} completada(s)`, accent: ambar, icon: <IconCheck /> },
    { label: "Certificados emitidos", value: certs, note: "descargables en PDF", accent: esmeralda, icon: <IconAward /> },
  ];

  const isAdmin = user.role === "ADMIN";
  const actions = [
    { href: "/admin/cursos", title: "Crear o editar cursos", text: "Módulos, lecciones y exámenes.", icon: <IconPlus />, accent: naranja },
    { href: "/avance", title: "Ver el avance", text: "Por curso, por persona y a Excel.", icon: <IconChart />, accent: turquesa },
    { href: "/admin/grupos", title: "Grupos", text: "Sedes, áreas o empresas.", icon: <IconList />, accent: indigo },
    ...(isAdmin
      ? [
          { href: "/admin/usuarios/importar", title: "Importar usuarios", text: "Desde un archivo CSV.", icon: <IconUpload />, accent: ambar },
          { href: "/admin/campos", title: "Campos de registro", text: "Datos que se piden al crear la cuenta.", icon: <IconSliders />, accent: esmeralda },
          { href: "/admin/auditoria", title: "Auditoría", text: "Quién hizo qué y cuándo.", icon: <IconList />, accent: naranja },
        ]
      : []),
  ];

  return (
    <>
      <PageHeader title="Administración" subtitle="Cree cursos, asigne capacitaciones y haga seguimiento." />
      <div className="mb-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <Stat
            key={stat.label}
            className="enter"
            style={{ "--i": i } as React.CSSProperties}
            label={stat.label}
            value={stat.value}
            note={stat.note}
            accent={stat.accent}
            icon={stat.icon}
          />
        ))}
      </div>

      <h2 className="mb-3 text-xl text-navy">Accesos rápidos</h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map((action, i) => (
          <li key={action.href} className="enter" style={{ "--i": i + 4 } as React.CSSProperties}>
            <Link href={action.href} className="block h-full">
              <Card interactive className="flex h-full items-center gap-3.5 p-4">
                <IconChip accent={action.accent}>{action.icon}</IconChip>
                <div>
                  <p className="font-semibold text-navy">{action.title}</p>
                  <p className="text-sm text-zinc-600">{action.text}</p>
                </div>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
