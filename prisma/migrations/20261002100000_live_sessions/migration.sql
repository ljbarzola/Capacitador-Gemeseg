-- Sesiones en vivo: nuevo tipo de leccion, fecha/hora/instructor y asistencia.
ALTER TYPE "LessonType" ADD VALUE 'SESSION';

CREATE TYPE "AttendanceStatus" AS ENUM ('ATTENDED', 'EXCUSED', 'ABSENT');

ALTER TABLE "Lesson" ADD COLUMN "startsAt" TIMESTAMP(3),
ADD COLUMN "instructorId" TEXT;

CREATE INDEX "Lesson_instructorId_idx" ON "Lesson"("instructorId");

CREATE TABLE "SessionAttendance" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "markedById" TEXT,

    CONSTRAINT "SessionAttendance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SessionAttendance_lessonId_userId_key" ON "SessionAttendance"("lessonId", "userId");
CREATE INDEX "SessionAttendance_userId_idx" ON "SessionAttendance"("userId");

ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SessionAttendance" ADD CONSTRAINT "SessionAttendance_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SessionAttendance" ADD CONSTRAINT "SessionAttendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SessionAttendance" ADD CONSTRAINT "SessionAttendance_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
