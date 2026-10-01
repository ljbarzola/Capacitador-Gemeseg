-- Fase 2: ciclos de certificacion, certificados con copia de los datos al emitir y vigencia por defecto.

-- Vigencia por defecto de 12 meses para cursos nuevos.
ALTER TABLE "Course" ALTER COLUMN "recertMonths" SET DEFAULT 12;

-- El avance cuenta solo si es posterior al inicio del ciclo; los ciclos existentes arrancan al asignarse.
ALTER TABLE "Enrollment" ADD COLUMN "cycleStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "Enrollment" SET "cycleStartedAt" = "assignedAt";

-- Un mismo inscrito puede tener varios certificados (uno por ciclo de recertificacion).
DROP INDEX "Certificate_enrollmentId_key";
CREATE INDEX "Certificate_enrollmentId_idx" ON "Certificate"("enrollmentId");

-- Datos del certificado tal como estaban al emitirlo (la tabla aun no tiene filas).
ALTER TABLE "Certificate" ADD COLUMN "holderName" TEXT NOT NULL,
ADD COLUMN "holderCedula" TEXT NOT NULL,
ADD COLUMN "courseTitle" TEXT NOT NULL;
