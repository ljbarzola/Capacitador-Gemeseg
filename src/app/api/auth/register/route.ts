import * as z from "zod";
import { audit } from "@/lib/audit";
import { getAdminAuth } from "@/lib/firebase/admin";
import { getPrisma } from "@/lib/prisma";
import { getActiveFields, validateExtra } from "@/lib/registration-fields";
import { registerSchema } from "@/lib/validation/auth";

// Crea la cuenta en Firebase y el usuario en la base, validando antes la cédula y que
// no esté repetida. El navegador inicia sesión después con el correo y la contraseña.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ errors: z.flattenError(parsed.error).fieldErrors }, { status: 400 });
  }
  const { firstNames, lastNames, cedula, email, password } = parsed.data;

  // Campos adicionales configurados por el administrador.
  const extraRaw = (body as { extra?: Record<string, unknown> } | null)?.extra;
  const extra = validateExtra(await getActiveFields(), extraRaw);
  if (Object.keys(extra.errors).length > 0) {
    return Response.json({ errors: { extra: extra.errors } }, { status: 400 });
  }

  const prisma = getPrisma();
  const existing = await prisma.user.findFirst({
    where: { OR: [{ cedula }, { email }] },
    select: { cedula: true, email: true },
  });
  if (existing) {
    const errors =
      existing.cedula === cedula
        ? { cedula: ["Esta cédula ya está registrada"] }
        : { email: ["Este correo ya está registrado"] };
    return Response.json({ errors }, { status: 409 });
  }

  const auth = getAdminAuth();
  let uid: string;
  try {
    const created = await auth.createUser({
      email,
      password,
      displayName: `${firstNames} ${lastNames}`,
    });
    uid = created.uid;
  } catch (error) {
    if ((error as { code?: string }).code === "auth/email-already-exists") {
      return Response.json(
        { errors: { email: ["Este correo ya está registrado"] } },
        { status: 409 },
      );
    }
    console.error("register: createUser", error);
    return Response.json({ message: "No se pudo crear la cuenta." }, { status: 500 });
  }

  try {
    const created = await prisma.user.create({
      data: { firebaseUid: uid, email, firstNames, lastNames, cedula, extraFields: extra.values },
      select: { id: true },
    });
    await audit({ id: created.id, firstNames, lastNames }, "usuario.registro", `${firstNames} ${lastNames} se registró (${email})`, {
      entity: "usuario",
      entityId: created.id,
    });
  } catch (error) {
    // Evita una cuenta de Firebase huérfana sin usuario en la base.
    await auth.deleteUser(uid).catch(() => {});
    if ((error as { code?: string }).code === "P2002") {
      return Response.json(
        { errors: { cedula: ["Esta cédula o correo ya está registrado"] } },
        { status: 409 },
      );
    }
    console.error("register: user.create", error);
    return Response.json({ message: "No se pudo crear la cuenta." }, { status: 500 });
  }

  return Response.json({ ok: true }, { status: 201 });
}
