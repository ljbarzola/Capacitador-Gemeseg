import type { Metadata } from "next";
import { ConfirmButton } from "@/components/confirm-button";
import { Button, Card, Flash, Input, PageHeader } from "@/components/ui";
import { requireStaff } from "@/lib/dal";
import { getPrisma } from "@/lib/prisma";
import { createGroup, deleteGroup, renameGroup } from "./actions";

export const metadata: Metadata = { title: "Grupos · Capacitación Gemeseg" };

export default async function GroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireStaff();
  const query = await searchParams;
  const groups = await getPrisma().group.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, _count: { select: { users: true } } },
  });

  return (
    <>
      <PageHeader
        title="Grupos"
        subtitle="Empresas, áreas o sedes. Sirven para filtrar personas y asignar cursos a todo un grupo."
      />
      <Flash ok={query.ok} error={query.error} />
      <Card className="mb-6">
        <form action={createGroup} className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-60 flex-1 flex-col gap-1 text-sm font-medium text-navy">
            Nuevo grupo
            <Input name="name" required maxLength={80} placeholder="Ej.: Sede Quito" />
          </label>
          <Button type="submit">Crear grupo</Button>
        </form>
      </Card>
      {groups.length === 0 ? (
        <p className="text-sm text-zinc-600">Aún no hay grupos.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {groups.map((group) => (
            <li key={group.id}>
              <Card className="flex flex-wrap items-center gap-3">
                <form action={renameGroup} className="flex min-w-60 flex-1 items-center gap-2">
                  <input type="hidden" name="id" value={group.id} />
                  <Input name="name" defaultValue={group.name} required maxLength={80} aria-label="Nombre del grupo" />
                  <Button type="submit" variant="secondary">
                    Guardar
                  </Button>
                </form>
                <span className="text-sm text-zinc-600">{group._count.users} persona(s)</span>
                <form action={deleteGroup}>
                  <input type="hidden" name="id" value={group.id} />
                  <ConfirmButton
                    variant="danger"
                    message={`¿Eliminar el grupo "${group.name}"? Las personas del grupo quedarán sin grupo.`}
                  >
                    Eliminar
                  </ConfirmButton>
                </form>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
