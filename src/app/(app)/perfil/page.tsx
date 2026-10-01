import type { Metadata } from "next";
import { Button, Card, Field, Flash, Input, PageHeader, Select } from "@/components/ui";
import { requireUser } from "@/lib/dal";
import { getPrisma } from "@/lib/prisma";
import { getActiveFields } from "@/lib/registration-fields";
import { saveProfile } from "./actions";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: "Mi perfil · Capacitación Gemeseg" };

const ROLE_LABEL = { STUDENT: "Estudiante", INSTRUCTOR: "Instructor", ADMIN: "Administrador" } as const;

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const me = await requireUser();
  const query = await searchParams;
  const [fields, user] = await Promise.all([
    getActiveFields(),
    getPrisma().user.findUnique({
      where: { id: me.id },
      select: { email: true, cedula: true, group: { select: { name: true } }, extraFields: true },
    }),
  ]);
  const answers = (user?.extraFields ?? {}) as Record<string, string>;

  const identity = [
    ["Nombres y apellidos", `${me.firstNames} ${me.lastNames}`],
    ["Cédula", user?.cedula ?? me.cedula],
    ["Correo", user?.email ?? me.email],
    ["Rol", ROLE_LABEL[me.role]],
    ["Grupo", user?.group?.name ?? "Sin grupo"],
  ];

  return (
    <>
      <PageHeader title="Mi perfil" subtitle="Sus datos y la seguridad de su cuenta." />
      <Flash ok={query.ok} error={query.error} />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg text-navy">Datos de la cuenta</h2>
          <dl className="divide-y divide-zinc-100 text-sm">
            {identity.map(([label, value]) => (
              <div key={label} className="grid grid-cols-[9rem_1fr] gap-3 py-2.5">
                <dt className="text-zinc-500">{label}</dt>
                <dd className="font-medium text-navy">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-zinc-500">
            Si necesita corregir su nombre, cédula o correo, pídaselo al administrador de la plataforma.
          </p>
        </Card>

        {fields.length > 0 && (
          <Card>
            <h2 className="mb-4 text-lg text-navy">Datos adicionales</h2>
            <form action={saveProfile} className="grid gap-4">
              {fields.map((field) => (
                <Field key={field.key} label={field.required ? field.label : `${field.label} (opcional)`}>
                  {field.type === "SELECT" ? (
                    <Select name={`extra_${field.key}`} defaultValue={answers[field.key] ?? ""}>
                      <option value="">Elija una opción</option>
                      {field.options.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Input name={`extra_${field.key}`} defaultValue={answers[field.key] ?? ""} maxLength={200} />
                  )}
                </Field>
              ))}
              <div>
                <Button type="submit">Guardar datos</Button>
              </div>
            </form>
          </Card>
        )}

        <Card className="lg:col-span-2">
          <h2 className="mb-1 text-lg text-navy">Cambiar contraseña</h2>
          <p className="mb-4 text-sm text-zinc-600">
            Use una contraseña que solo usted conozca. Si la olvida, puede recuperarla desde la pantalla de ingreso.
          </p>
          <PasswordForm />
        </Card>
      </div>
    </>
  );
}
