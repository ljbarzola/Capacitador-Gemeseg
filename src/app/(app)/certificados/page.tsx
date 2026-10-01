import type { Metadata } from "next";
import Link from "next/link";
import { CertBadge } from "@/components/status";
import { IconDownload } from "@/components/icons";
import { Button, Empty, LinkButton, PageHeader, TableWrap, Td, Th } from "@/components/ui";
import { certState } from "@/lib/certificates";
import { requireUser } from "@/lib/dal";
import { formatDate } from "@/lib/format";
import { getPrisma } from "@/lib/prisma";
import { restartCertification } from "../cursos/[courseId]/actions";

export const metadata: Metadata = { title: "Mis certificados · Capacitación Gemeseg" };

export default async function CertificatesPage() {
  const user = await requireUser();
  const certificates = await getPrisma().certificate.findMany({
    where: { enrollment: { userId: user.id } },
    orderBy: { issuedAt: "desc" },
    select: {
      id: true,
      code: true,
      courseTitle: true,
      issuedAt: true,
      expiresAt: true,
      enrollmentId: true,
      enrollment: { select: { courseId: true, course: { select: { published: true } } } },
    },
  });
  // Solo el certificado más reciente de cada curso se puede renovar.
  const latestByEnrollment = new Map<string, string>();
  for (const c of certificates) if (!latestByEnrollment.has(c.enrollmentId)) latestByEnrollment.set(c.enrollmentId, c.id);

  return (
    <>
      <PageHeader
        title="Mis certificados"
        subtitle="Se generan solos al completar cada curso. Puede descargarlos en PDF cuando los necesite."
        actions={
          <LinkButton href="/verificar" variant="secondary">
            Verificar un certificado
          </LinkButton>
        }
      />
      {certificates.length === 0 ? (
        <Empty>
          Todavía no tiene certificados. Al completar un curso aparecerá aquí.{" "}
          <Link href="/panel" className="font-semibold text-navy underline">
            Ver mis cursos
          </Link>
        </Empty>
      ) : (
        <TableWrap minWidth={760}>
          <thead>
            <tr>
              <Th>Curso</Th>
              <Th>Emitido</Th>
              <Th>Vigencia</Th>
              <Th>Código</Th>
              <Th className="text-right">Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {certificates.map((c) => {
              const state = certState(c.expiresAt);
              const renewable =
                latestByEnrollment.get(c.enrollmentId) === c.id &&
                (state === "expired" || state === "expiring") &&
                c.enrollment.course.published;
              return (
                <tr key={c.id}>
                  <Td className="font-medium">{c.courseTitle}</Td>
                  <Td className="text-zinc-600">{formatDate(c.issuedAt)}</Td>
                  <Td>
                    <div className="flex flex-col items-start gap-1">
                      <CertBadge state={state} />
                      <span className="text-xs text-zinc-500">
                        {c.expiresAt ? `hasta el ${formatDate(c.expiresAt)}` : "sin vencimiento"}
                      </span>
                    </div>
                  </Td>
                  <Td className="font-mono text-xs text-zinc-600">{c.code}</Td>
                  <Td>
                    <div className="flex flex-wrap justify-end gap-2">
                      <LinkButton href={`/api/certificados/${c.id}`} variant="secondary" prefetch={false}>
                        <IconDownload /> Descargar PDF
                      </LinkButton>
                      {renewable && (
                        <form action={restartCertification}>
                          <input type="hidden" name="courseId" value={c.enrollment.courseId} />
                          <Button type="submit">Renovar</Button>
                        </form>
                      )}
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      )}
    </>
  );
}
