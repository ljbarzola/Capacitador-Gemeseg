import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-ui";
import { getActiveFields } from "@/lib/registration-fields";
import { RegistroForm } from "./registro-form";

export const metadata: Metadata = { title: "Crear cuenta · Capacitación Gemeseg" };

// Los campos adicionales los configura el administrador, así que se leen en cada visita.
export const dynamic = "force-dynamic";

export default async function RegistroPage() {
  const fields = await getActiveFields().catch(() => []);

  return (
    <AuthCard
      title="Crear cuenta"
      subtitle="Complete sus datos para acceder a la plataforma."
      footer={
        <>
          ¿Ya tiene cuenta?{" "}
          <Link href="/login" className="font-semibold text-[#c42d12] underline">
            Ingrese
          </Link>
        </>
      }
    >
      <RegistroForm
        extraFields={fields.map((f) => ({ key: f.key, label: f.label, type: f.type, options: f.options, required: f.required }))}
      />
    </AuthCard>
  );
}
