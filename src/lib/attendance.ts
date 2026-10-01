import "server-only";
import type { AttendanceStatus, Role } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";

// Asistencia a sesiones en vivo: quién puede marcarla y la lista de inscritos con su marca.

export type RosterRow = {
  userId: string;
  firstNames: string;
  lastNames: string;
  cedula: string;
  group: string | null;
  status: AttendanceStatus | null; // null = sin marcar
};

export async function getSession(lessonId: string) {
  const lesson = await getPrisma().lesson.findFirst({
    where: { id: lessonId, type: "SESSION" },
    select: {
      id: true,
      title: true,
      startsAt: true,
      url: true,
      body: true,
      instructorId: true,
      instructor: { select: { firstNames: true, lastNames: true } },
      submodule: { select: { module: { select: { courseId: true, course: { select: { title: true } } } } } },
    },
  });
  if (!lesson) return null;
  return {
    id: lesson.id,
    title: lesson.title,
    startsAt: lesson.startsAt,
    url: lesson.url,
    body: lesson.body,
    instructorId: lesson.instructorId,
    instructorName: lesson.instructor ? `${lesson.instructor.firstNames} ${lesson.instructor.lastNames}` : null,
    courseId: lesson.submodule.module.courseId,
    courseTitle: lesson.submodule.module.course.title,
  };
}

// Solo el instructor responsable de la sesión o un administrador pueden marcar asistencia.
export function canMarkAttendance(user: { id: string; role: Role }, session: { instructorId: string | null }) {
  return user.role === "ADMIN" || (user.role === "INSTRUCTOR" && session.instructorId === user.id);
}

// Inscritos activos del curso con su marca. Una marca de un ciclo anterior (antes de recertificar)
// no cuenta, igual que en el avance, así que se muestra como "sin marcar".
export async function loadRoster(courseId: string, lessonId: string): Promise<RosterRow[]> {
  const prisma = getPrisma();
  const [enrollments, marks] = await Promise.all([
    prisma.enrollment.findMany({
      where: { courseId, user: { active: true } },
      select: {
        userId: true,
        cycleStartedAt: true,
        user: { select: { firstNames: true, lastNames: true, cedula: true, group: { select: { name: true } } } },
      },
    }),
    prisma.sessionAttendance.findMany({ where: { lessonId }, select: { userId: true, status: true, markedAt: true } }),
  ]);
  const byUser = new Map(marks.map((m) => [m.userId, m]));
  return enrollments
    .map((e) => {
      const mark = byUser.get(e.userId);
      return {
        userId: e.userId,
        firstNames: e.user.firstNames,
        lastNames: e.user.lastNames,
        cedula: e.user.cedula,
        group: e.user.group?.name ?? null,
        status: mark && mark.markedAt >= e.cycleStartedAt ? mark.status : null,
      };
    })
    .sort((a, b) => a.lastNames.localeCompare(b.lastNames, "es") || a.firstNames.localeCompare(b.firstNames, "es"));
}
