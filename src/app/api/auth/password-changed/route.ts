import { audit } from "@/lib/audit";
import { getSessionUser } from "@/lib/dal";
import { getPrisma } from "@/lib/prisma";

// El navegador avisa que ya cambió la contraseña en Firebase: se apaga el aviso de contraseña inicial.
export async function POST() {
  const user = await getSessionUser();
  if (!user) return Response.json({ message: "No autorizado" }, { status: 401 });
  if (user.mustChangePassword) {
    await getPrisma().user.update({ where: { id: user.id }, data: { mustChangePassword: false } });
  }
  await audit(user, "usuario.contrasena", `${user.firstNames} ${user.lastNames} cambió su contraseña`, {
    entity: "usuario",
    entityId: user.id,
  });
  return Response.json({ ok: true });
}
