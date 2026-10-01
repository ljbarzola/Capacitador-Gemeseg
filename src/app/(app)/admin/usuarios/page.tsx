import type { Metadata } from "next";
import { Badge, Button, Card, Flash, Input, LinkButton, PageHeader, Select } from "@/components/ui";
import { requireRole } from "@/lib/dal";
import { first } from "@/lib/form";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import { updateUser } from "./actions";

export const metadata: Metadata = { title: "Usuarios · Capacitación Gemeseg" };

const PAGE_SIZE = 25;
const ROLE_LABEL = { STUDENT: "Estudiante", INSTRUCTOR: "Instructor", ADMIN: "Administrador" } as const;

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const me = await requireRole("ADMIN");
  const query = await searchParams;
  const q = first(query.q)?.trim() ?? "";
  const role = first(query.rol);
  const groupFilter = first(query.grupo) ?? "";
  const page = Math.max(1, Number(first(query.pagina)) || 1);

  const where: Prisma.UserWhereInput = {
    ...(q && {
      OR: [
        { firstNames: { contains: q, mode: "insensitive" } },
        { lastNames: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { cedula: { contains: q, mode: "insensitive" } },
      ],
    }),
    ...(role && role in ROLE_LABEL && { role: role as keyof typeof ROLE_LABEL }),
    ...(groupFilter === "ninguno" ? { groupId: null } : groupFilter ? { groupId: groupFilter } : {}),
  };

  const prisma = getPrisma();
  const [users, total, groups] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [{ lastNames: "asc" }, { firstNames: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        firstNames: true,
        lastNames: true,
        email: true,
        cedula: true,
        role: true,
        active: true,
        groupId: true,
      },
    }),
    prisma.user.count({ where }),
    prisma.group.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (role) params.set("rol", role);
  if (groupFilter) params.set("grupo", groupFilter);
  const withPage = (p: number) => {
    const next = new URLSearchParams(params);
    if (p > 1) next.set("pagina", String(p));
    return `/admin/usuarios${next.size ? `?${next}` : ""}`;
  };
  const back = withPage(page);

  return (
    <>
      <PageHeader title="Usuarios" subtitle={`${total} persona(s) encontradas.`} />
      <Flash ok={query.ok} error={query.error} />
      <Card className="mb-6">
        <form className="grid gap-3 sm:grid-cols-[1fr_12rem_12rem_auto]" action="/admin/usuarios">
          <Input name="q" defaultValue={q} placeholder="Buscar por nombre, correo o cédula" aria-label="Buscar" />
          <Select name="rol" defaultValue={role ?? ""} aria-label="Rol">
            <option value="">Todos los roles</option>
            {Object.entries(ROLE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Select name="grupo" defaultValue={groupFilter} aria-label="Grupo">
            <option value="">Todos los grupos</option>
            <option value="ninguno">Sin grupo</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="secondary">
            Filtrar
          </Button>
        </form>
      </Card>

      <ul className="flex flex-col gap-3">
        {users.map((user) => {
          const self = user.id === me.id;
          return (
            <li key={user.id}>
              <Card>
                <form action={updateUser} className="grid items-end gap-3 lg:grid-cols-[1.6fr_1fr_1fr_auto_auto]">
                  <input type="hidden" name="id" value={user.id} />
                  <input type="hidden" name="back" value={back} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-navy">
                      {user.lastNames} {user.firstNames} {self && <Badge tone="blue">Usted</Badge>}
                    </p>
                    <p className="truncate text-sm text-zinc-600">{user.email}</p>
                    <p className="text-xs text-zinc-500">Cédula {user.cedula}</p>
                  </div>
                  <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
                    Rol
                    <Select name="role" defaultValue={user.role} disabled={self}>
                      {Object.entries(ROLE_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                    {self && <input type="hidden" name="role" value={user.role} />}
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
                    Grupo
                    <Select name="groupId" defaultValue={user.groupId ?? ""}>
                      <option value="">Sin grupo</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label className="flex items-center gap-2 pb-2 text-sm text-navy">
                    <input
                      type="checkbox"
                      name="active"
                      defaultChecked={user.active}
                      disabled={self}
                      className="size-4 accent-[#ee3b1b]"
                    />
                    Activo
                    {self && user.active && <input type="hidden" name="active" value="on" />}
                  </label>
                  <Button type="submit" variant="secondary">
                    Guardar
                  </Button>
                </form>
              </Card>
            </li>
          );
        })}
      </ul>

      {pages > 1 && (
        <nav aria-label="Paginación" className="mt-6 flex items-center justify-center gap-3 text-sm">
          {page > 1 && (
            <LinkButton href={withPage(page - 1)} variant="secondary">
              ← Anterior
            </LinkButton>
          )}
          <span className="text-zinc-600">
            Página {page} de {pages}
          </span>
          {page < pages && (
            <LinkButton href={withPage(page + 1)} variant="secondary">
              Siguiente →
            </LinkButton>
          )}
        </nav>
      )}
    </>
  );
}
