import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-ui";
import { RecuperarForm } from "./recuperar-form";

export const metadata: Metadata = { title: "Recuperar contraseña · Capacitación Gemeseg" };

export default function RecuperarPage() {
  return (
    <AuthCard
      title="Recuperar contraseña"
      subtitle="Le enviaremos un enlace a su correo."
      footer={
        <Link href="/login" className="font-semibold text-brand underline">
          Volver a ingresar
        </Link>
      }
    >
      <RecuperarForm />
    </AuthCard>
  );
}
