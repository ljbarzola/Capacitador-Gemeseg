import type { EnrollmentStatus } from "@/generated/prisma/client";
import { Badge } from "@/components/ui";
import { CERT_STATE_LABEL, type CertState } from "@/lib/certificates";

export function EnrollmentBadge({ status, overdue }: { status: EnrollmentStatus; overdue?: boolean }) {
  if (status === "COMPLETED") return <Badge tone="green">Completado</Badge>;
  if (overdue) return <Badge tone="red">Atrasado</Badge>;
  if (status === "IN_PROGRESS") return <Badge tone="blue">En curso</Badge>;
  return <Badge>Sin iniciar</Badge>;
}

export function CertBadge({ state }: { state: CertState }) {
  const tone = state === "expired" ? "red" : state === "expiring" ? "amber" : "green";
  return <Badge tone={tone}>{CERT_STATE_LABEL[state]}</Badge>;
}
