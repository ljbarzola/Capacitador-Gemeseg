-- CreateEnum
CREATE TYPE "CertificateKind" AS ENUM ('COURSE', 'MODULE');

-- AlterEnum
ALTER TYPE "LessonType" ADD VALUE 'CARDS';

-- AlterTable
ALTER TABLE "Certificate" ADD COLUMN     "kind" "CertificateKind" NOT NULL DEFAULT 'COURSE',
ADD COLUMN     "moduleId" TEXT,
ADD COLUMN     "moduleTitle" TEXT;

-- AlterTable
ALTER TABLE "Module" ADD COLUMN     "issuesCertificate" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "ModuleCompletion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModuleCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonCard" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "text" TEXT NOT NULL,
    "feedback" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "LessonCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonCardOption" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "LessonCardOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModuleCompletion_moduleId_idx" ON "ModuleCompletion"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleCompletion_userId_moduleId_key" ON "ModuleCompletion"("userId", "moduleId");

-- CreateIndex
CREATE INDEX "LessonCard_lessonId_idx" ON "LessonCard"("lessonId");

-- CreateIndex
CREATE INDEX "LessonCardOption_cardId_idx" ON "LessonCardOption"("cardId");

-- AddForeignKey
ALTER TABLE "ModuleCompletion" ADD CONSTRAINT "ModuleCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleCompletion" ADD CONSTRAINT "ModuleCompletion_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonCard" ADD CONSTRAINT "LessonCard_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonCardOption" ADD CONSTRAINT "LessonCardOption_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "LessonCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
