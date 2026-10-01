import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BrandPanel } from "@/components/auth-ui";
import { Button, Input } from "@/components/ui";
import { normalizeCode } from "@/lib/certificates";
import { first } from "@/lib/form";

export const metadata: Metadata = { title: "Verificar certificado · Capacitación Gemeseg" };

export default async function VerifyIndex({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const code = first((await searchParams).codigo);
  if (code?.trim()) redirect(`/verificar/${encodeURIComponent(normalizeCode(code))}`);

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <BrandPanel compact />
      <main className="flex flex-1 items-center justify-center px-5 py-12">
        <form className="w-full max-w-md" action="/verificar">
          <h1 className="text-3xl text-navy">Verificar un certificado</h1>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-zinc-600">
            Escriba el código que aparece al pie del certificado, o escanee su código QR.
          </p>
          <label className="mt-7 flex flex-col gap-1.5 text-sm font-medium text-navy">
            Código del certificado
            <Input name="codigo" placeholder="GMS-XXXX-XXXX" autoComplete="off" required className="py-2.5 text-base uppercase" />
          </label>
          <Button type="submit" className="mt-4 min-h-11 w-full">
            Verificar
          </Button>
        </form>
      </main>
    </div>
  );
}
