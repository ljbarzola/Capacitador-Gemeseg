import type { Metadata } from "next";
import Link from "next/link";
import { Card, LinkButton, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/dal";
import { getActiveFields } from "@/lib/registration-fields";
import { ImportForm } from "./import-form";

export const metadata: Metadata = { title: "Importar usuarios · Capacitación Gemeseg" };

export default async function ImportPage() {
  await requireRole("ADMIN");
  const fields = await getActiveFields();

  return (
    <>
      <PageHeader
        title="Importar usuarios"
        subtitle="Cree muchas cuentas de una vez desde un archivo de Excel guardado como CSV."
        actions={
          <LinkButton href="/api/usuarios/plantilla" variant="secondary" prefetch={false}>
            Descargar plantilla
          </LinkButton>
        }
      />
      <Card className="mb-6 max-w-3xl text-sm text-zinc-700">
        <p className="font-medium text-navy">Columnas del archivo</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            Obligatorias: <strong>cedula</strong> (10 números), <strong>nombres</strong>, <strong>apellidos</strong> y{" "}
            <strong>correo</strong>.
          </li>
          <li>
            Opcional: <strong>grupo</strong> (si no existe, se crea).
          </li>
          {fields.length > 0 && (
            <li>
              Campos de registro: {fields.map((f) => <strong key={f.key}>{f.label} </strong>)}
              (use el mismo nombre en el encabezado).
            </li>
          )}
        </ul>
        <p className="mt-3">
          Las cuentas se crean con una contraseña inicial generada, que usted descarga al terminar. No se envían correos.
          También puede <Link href="/admin/usuarios" className="font-semibold text-navy underline">volver a Usuarios</Link>.
        </p>
      </Card>
      <ImportForm />
    </>
  );
}
