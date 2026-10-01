import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-ui";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Ingresar · Capacitación Gemeseg" };

export default function LoginPage() {
  return (
    <AuthCard
      title="Ingresar"
      subtitle="Acceda a sus cursos de capacitación."
      footer={
        <>
          ¿Aún no tiene cuenta?{" "}
          <Link href="/registro" className="font-semibold text-brand underline">
            Regístrese
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthCard>
  );
}
