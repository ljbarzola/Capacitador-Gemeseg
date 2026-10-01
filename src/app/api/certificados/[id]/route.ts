import { renderCertificatePdf } from "@/lib/certificate-pdf";
import { getSessionUser, isStaff } from "@/lib/dal";
import { getPrisma } from "@/lib/prisma";
import { getBaseUrl } from "@/lib/site";

// Descarga del certificado en PDF: solo su titular o el personal de la plataforma.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return new Response("No autorizado", { status: 401 });

  const { id } = await params;
  const cert = await getPrisma().certificate.findUnique({
    where: { id },
    select: {
      code: true,
      holderName: true,
      holderCedula: true,
      courseTitle: true,
      issuedAt: true,
      expiresAt: true,
      enrollment: { select: { userId: true } },
    },
  });
  if (!cert || (cert.enrollment.userId !== user.id && !isStaff(user.role))) {
    return new Response("No encontrado", { status: 404 });
  }

  const pdf = await renderCertificatePdf(cert, `${await getBaseUrl()}/verificar/${cert.code}`);
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Certificado-${cert.code}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
