import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-ui";
import { RegistroForm } from "./registro-form";

export const metadata: Metadata = { title: "Crear cuenta · Capacitación Gemeseg" };

export default function RegistroPage() {
  return (
    <AuthCard
      title="Crear cuenta"
      subtitle="Complete sus datos para acceder a la plataforma."
      footer={
        <>
          ¿Ya tiene cuenta?{" "}
          <Link href="/login" className="font-semibold text-brand underline">
            Ingrese
          </Link>
        </>
      }
    >
      <RegistroForm />
    </AuthCard>
  );
}
