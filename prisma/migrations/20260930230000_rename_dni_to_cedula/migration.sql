-- Renombra dni -> cedula conservando datos e índice único.
ALTER TABLE "User" RENAME COLUMN "dni" TO "cedula";
ALTER INDEX "User_dni_key" RENAME TO "User_cedula_key";
