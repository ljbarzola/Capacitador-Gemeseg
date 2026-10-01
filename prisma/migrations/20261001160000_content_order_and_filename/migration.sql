-- El orden deja de ser unico para poder reordenar (intercambiar posiciones) sin choques.
DROP INDEX "Module_courseId_order_key";
DROP INDEX "Submodule_moduleId_order_key";
DROP INDEX "Lesson_submoduleId_order_key";

CREATE INDEX "Module_courseId_idx" ON "Module"("courseId");
CREATE INDEX "Submodule_moduleId_idx" ON "Submodule"("moduleId");
CREATE INDEX "Lesson_submoduleId_idx" ON "Lesson"("submoduleId");

ALTER TABLE "Lesson" ADD COLUMN "fileName" TEXT;
