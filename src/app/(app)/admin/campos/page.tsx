import type { Metadata } from "next";
import { ConfirmButton } from "@/components/confirm-button";
import { Badge, Button, Card, Empty, Field, Flash, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { requireRole } from "@/lib/dal";
import { getPrisma } from "@/lib/prisma";
import { createField, deleteField, moveField, updateField } from "./actions";

export const metadata: Metadata = { title: "Campos de registro · Capacitación Gemeseg" };

export default async function FieldsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireRole("ADMIN");
  const query = await searchParams;
  const fields = await getPrisma().registrationField.findMany({
    orderBy: [{ order: "asc" }, { id: "asc" }],
  });

  return (
    <>
      <PageHeader
        title="Campos de registro"
        subtitle="Datos adicionales que se piden al crear la cuenta, como cargo, sede o empresa. Nombres, apellidos, cédula, correo y contraseña siempre se piden."
      />
      <Flash ok={query.ok} error={query.error} />

      <Card className="mb-8 max-w-3xl">
        <h2 className="mb-4 text-lg text-navy">Nuevo campo</h2>
        <form action={createField} className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre del campo">
            <Input name="label" required maxLength={60} placeholder="Ej.: Cargo" />
          </Field>
          <Field label="Tipo">
            <Select name="type" defaultValue="TEXT">
              <option value="TEXT">Texto libre</option>
              <option value="SELECT">Lista de opciones</option>
            </Select>
          </Field>
          <Field label="Opciones (solo para lista)" hint="Una por línea. Ej.: Sede Quito, Sede Guayaquil." className="sm:col-span-2">
            <Textarea name="options" rows={3} placeholder={"Sede Quito\nSede Guayaquil"} />
          </Field>
          <label className="flex items-center gap-2 text-sm font-medium text-navy sm:col-span-2">
            <input type="checkbox" name="required" className="size-4 accent-[#100f31]" />
            Obligatorio al registrarse
          </label>
          <div className="sm:col-span-2">
            <Button type="submit">Agregar campo</Button>
          </div>
        </form>
      </Card>

      <h2 className="mb-3 text-xl text-navy">Campos actuales</h2>
      {fields.length === 0 ? (
        <Empty>Todavía no hay campos adicionales. El registro pide solo los datos básicos.</Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {fields.map((field, index) => (
            <li key={field.id}>
              <Card>
                <form action={updateField} className="grid gap-3 sm:grid-cols-2">
                  <input type="hidden" name="id" value={field.id} />
                  <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                    <span className="text-sm font-semibold text-zinc-500">Campo {index + 1}</span>
                    <Badge>{field.type === "SELECT" ? "Lista" : "Texto"}</Badge>
                    {!field.active && <Badge tone="amber">Oculto</Badge>}
                    <span className="text-xs text-zinc-400">clave: {field.key}</span>
                  </div>
                  <Field label="Nombre">
                    <Input name="label" defaultValue={field.label} required maxLength={60} />
                  </Field>
                  {field.type === "SELECT" && (
                    <Field label="Opciones (una por línea)">
                      <Textarea name="options" rows={3} defaultValue={field.options.join("\n")} />
                    </Field>
                  )}
                  <div className="flex flex-wrap items-center gap-5 sm:col-span-2">
                    <label className="flex items-center gap-2 text-sm text-navy">
                      <input type="checkbox" name="required" defaultChecked={field.required} className="size-4 accent-[#100f31]" />
                      Obligatorio
                    </label>
                    <label className="flex items-center gap-2 text-sm text-navy">
                      <input type="checkbox" name="active" defaultChecked={field.active} className="size-4 accent-[#100f31]" />
                      Se muestra en el registro
                    </label>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                    <Button type="submit" variant="secondary">
                      Guardar
                    </Button>
                  </div>
                </form>
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3">
                  {(["up", "down"] as const).map((direction) => (
                    <form key={direction} action={moveField}>
                      <input type="hidden" name="id" value={field.id} />
                      <input type="hidden" name="direction" value={direction} />
                      <Button type="submit" variant="ghost" disabled={direction === "up" ? index === 0 : index === fields.length - 1}>
                        {direction === "up" ? "Subir" : "Bajar"}
                      </Button>
                    </form>
                  ))}
                  <form action={deleteField} className="ml-auto">
                    <input type="hidden" name="id" value={field.id} />
                    <ConfirmButton
                      variant="danger"
                      message={`¿Eliminar el campo «${field.label}»? Las respuestas que ya se guardaron se conservan pero dejan de mostrarse.`}
                    >
                      Eliminar
                    </ConfirmButton>
                  </form>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
