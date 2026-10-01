import { NavLink } from "@/components/nav-link";
import { requireStaff } from "@/lib/dal";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Administración" className="flex gap-6 overflow-x-auto border-b border-zinc-200">
        <NavLink href="/admin" exact>
          Resumen
        </NavLink>
        <NavLink href="/admin/cursos">Cursos</NavLink>
        <NavLink href="/admin/grupos">Grupos</NavLink>
        {user.role === "ADMIN" && <NavLink href="/admin/usuarios">Usuarios</NavLink>}
      </nav>
      <div>{children}</div>
    </div>
  );
}
