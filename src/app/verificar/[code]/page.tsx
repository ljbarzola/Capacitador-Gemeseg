import type { Metadata } from "next";
import Link from "next/link";
import { BrandPanel } from "@/components/auth-ui";
import { IconCheck } from "@/components/icons";
import { CERT_STATE_LABEL, certState, maskCedula, normalizeCode } from "@/lib/certificates";
import { formatDate } from "@/lib/format";
import { getPrisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Verificación de certificado · Capacitación Gemeseg",
  robots: { index: false },
};

// Página pública: confirma si un código de certificado existe y si sigue vigente.
export default async function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const code = normalizeCode(decodeURIComponent((await params).code));
  const cert = /^GMS-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)
    ? await getPrisma().certificate.findUnique({
        where: { code },
        select: { code: true, holderName: true, holderCedula: true, courseTitle: true, issuedAt: true, expiresAt: true },
      })
    : null;
  const state = cert ? certState(cert.expiresAt) : null;
  const expired = state === "expired";

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <BrandPanel compact />
      <main className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-lg">
          {cert ? (
            <>
              <div
                className={`flex items-center gap-3 rounded-md border-l-4 px-4 py-3 ${
                  expired ? "border-red-600 bg-red-50 text-red-900" : "border-green-700 bg-green-50 text-green-900"
                }`}
              >
                {!expired && <IconCheck width={20} height={20} />}
                <p className="font-semibold">
                  {expired ? "Certificado auténtico, pero vencido" : "Certificado auténtico y vigente"}
                </p>
              </div>
              <h1 className="mt-6 text-3xl text-navy">{cert.holderName}</h1>
              <p className="mt-1 text-zinc-600">Cédula {maskCedula(cert.holderCedula)}</p>
              <dl className="mt-6 divide-y divide-zinc-200 border-y border-zinc-200 text-sm">
                {[
                  ["Curso aprobado", cert.courseTitle],
                  ["Fecha de emisión", formatDate(cert.issuedAt)],
                  ["Vigencia", cert.expiresAt ? `Hasta el ${formatDate(cert.expiresAt)}` : "Sin vencimiento"],
                  ["Estado", CERT_STATE_LABEL[state!]],
                  ["Código", cert.code],
                ].map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[9rem_1fr] gap-3 py-3">
                    <dt className="text-zinc-600">{label}</dt>
                    <dd className="font-medium text-navy">{value}</dd>
                  </div>
                ))}
              </dl>
            </>
          ) : (
            <>
              <h1 className="text-3xl text-navy">No encontramos ese certificado</h1>
              <p className="mt-3 leading-relaxed text-zinc-600">
                El código <span className="font-semibold text-navy">{code || "ingresado"}</span> no corresponde a ningún
                certificado emitido por Gemeseg. Revise que esté bien escrito.
              </p>
            </>
          )}
          <p className="mt-8 text-sm">
            <Link href="/verificar" className="font-semibold text-brand underline">
              Verificar otro certificado
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
