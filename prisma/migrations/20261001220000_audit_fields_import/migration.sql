-- Fase 3: auditoria, campos de registro configurables e importacion de usuarios.
CREATE TYPE "FieldType" AS ENUM ('TEXT', 'SELECT');

ALTER TABLE "RegistrationField" ADD COLUMN "type" "FieldType" NOT NULL DEFAULT 'TEXT',
ADD COLUMN "options" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "summary" TEXT NOT NULL,
    "meta" JSONB,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
