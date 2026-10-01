"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { getPrisma } from "@/lib/prisma";
import { getActiveFields, validateExtra } from "@/lib/registration-fields";

// El usuario completa o corrige sus datos adicionales (los configurables del registro).
export async function saveProfile(formData: FormData) {
  const user = await requireUser();
  const fields = await getActiveFields();

  const raw: Record<string, unknown> = {};
  for (const field of fields) raw[field.key] = formData.get(`extra_${field.key}`);
  const { values, errors } = validateExtra(fields, raw);
  if (Object.keys(errors).length > 0) {
    redirect("/perfil?error=perfil_invalido");
  }

  // Se conservan respuestas de campos que ya no se muestran.
  const previous = (user.extraFields ?? {}) as Record<string, string>;
  await getPrisma().user.update({
    where: { id: user.id },
    data: { extraFields: { ...previous, ...values } },
  });
  redirect("/perfil?ok=perfil_guardado");
}
