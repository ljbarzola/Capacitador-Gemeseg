import "server-only";
import type { EnrollmentStatus, Progression } from "@/generated/prisma/client";
import { type CertState, certState } from "@/lib/certificates";
import { getPrisma } from "@/lib/prisma";

// Reportes de avance. Todo se calcula respetando el ciclo de cada inscripción: el avance
// anterior a una recertificación no cuenta para el ciclo actual.

export type PersonRow = {
  enrollmentId: string;
  userId: string;
  name: string;
  email: string;
  cedula: string;
  group: string | null;
  extra: Record<string, string>;
  status: EnrollmentStatus;
  assignedAt: Date;
  dueAt: Date | null;
  completedAt: Date | null;
  completed: number;
  total: number;
  percent: number;
  modules: { id: string; title: string; done: number; total: number }[];
  lastActivity: Date | null;
  avgScore: number | null; // promedio de la mejor nota de cada examen del ciclo
  overdue: boolean;
  cert: { id: string; code: string; issuedAt: Date; expiresAt: Date | null; state: CertState } | null;
};

export type QuizStat = {
  submoduleId: string;
  title: string;
  passingScore: number;
  attempts: number;
  people: number;
  passRate: number | null;
  avgScore: number | null;
  questions: { id: string; text: string; correctRate: number | null }[];
};

export type CourseReport = {
  course: { id: string; title: string; published: boolean; progression: Progression; recertMonths: number | null };
  total: number;
  people: PersonRow[];
  summary: {
    enrolled: number;
    completed: number;
    inProgress: number;
    notStarted: number;
    avgPercent: number;
    overdue: number;
    certValid: number;
    certExpiring: number;
    certExpired: number;
    passRate: number | null;
  };
  moduleStats: { id: string; title: string; items: number; completedPeople: number; avgPercent: number }[];
  quizzes: QuizStat[];
  feedback: { name: string; comment: string; createdAt: Date }[];
};

const order = [{ order: "asc" as const }, { id: "asc" as const }];
const avg = (values: number[]) => (values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null);

export async function getCourseReport(
  courseId: string,
  opts: { groupId?: string | null; userId?: string } = {},
): Promise<CourseReport | null> {
  const prisma = getPrisma();
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      published: true,
      progression: true,
      recertMonths: true,
      modules: {
        orderBy: order,
        select: {
          id: true,
          title: true,
          submodules: {
            orderBy: order,
            select: {
              id: true,
              title: true,
              lessons: { orderBy: order, select: { id: true } },
              quiz: {
                select: {
                  id: true,
                  passingScore: true,
                  questions: {
                    orderBy: order,
                    select: { id: true, text: true, options: { select: { id: true, isCorrect: true } } },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!course) return null;

  // Ítems por módulo: lecciones + exámenes con al menos una pregunta.
  const modules = course.modules.map((m) => {
    const lessons = m.submodules.flatMap((s) => s.lessons.map((l) => `l:${l.id}`));
    const quizzes = m.submodules.flatMap((s) => (s.quiz && s.quiz.questions.length > 0 ? [`q:${s.quiz.id}`] : []));
    return { id: m.id, title: m.title, keys: [...lessons, ...quizzes] };
  });
  const total = modules.reduce((n, m) => n + m.keys.length, 0);
  const quizDefs = course.modules.flatMap((m) =>
    m.submodules.flatMap((s) => (s.quiz && s.quiz.questions.length > 0 ? [{ submodule: s, quiz: s.quiz }] : [])),
  );
  const lessonIds = course.modules.flatMap((m) => m.submodules.flatMap((s) => s.lessons.map((l) => l.id)));

  const enrollments = await prisma.enrollment.findMany({
    where: {
      courseId,
      ...(opts.userId && { userId: opts.userId }),
      ...(opts.groupId && { user: { groupId: opts.groupId } }),
    },
    orderBy: [{ user: { lastNames: "asc" } }, { user: { firstNames: "asc" } }],
    select: {
      id: true,
      userId: true,
      status: true,
      assignedAt: true,
      dueAt: true,
      completedAt: true,
      cycleStartedAt: true,
      user: {
        select: {
          firstNames: true,
          lastNames: true,
          email: true,
          cedula: true,
          extraFields: true,
          group: { select: { name: true } },
        },
      },
      certificates: {
        orderBy: { issuedAt: "desc" },
        take: 1,
        select: { id: true, code: true, issuedAt: true, expiresAt: true },
      },
    },
  });
  const userIds = enrollments.map((e) => e.userId);

  const [progress, attempts, feedback] = await Promise.all([
    prisma.lessonProgress.findMany({
      where: { userId: { in: userIds }, lessonId: { in: lessonIds } },
      select: { userId: true, lessonId: true, completedAt: true },
    }),
    prisma.quizAttempt.findMany({
      where: { userId: { in: userIds }, quizId: { in: quizDefs.map((q) => q.quiz.id) } },
      select: { userId: true, quizId: true, score: true, passed: true, finishedAt: true, answers: true },
    }),
    prisma.courseFeedback.findMany({
      where: { courseId, userId: { in: userIds } },
      orderBy: { createdAt: "desc" },
      select: { comment: true, createdAt: true, user: { select: { firstNames: true, lastNames: true } } },
    }),
  ]);

  const progressByUser = new Map<string, { lessonId: string; at: Date }[]>();
  for (const p of progress) {
    const list = progressByUser.get(p.userId) ?? [];
    list.push({ lessonId: p.lessonId, at: p.completedAt });
    progressByUser.set(p.userId, list);
  }
  const attemptsByUser = new Map<string, typeof attempts>();
  for (const a of attempts) {
    const list = attemptsByUser.get(a.userId) ?? [];
    list.push(a);
    attemptsByUser.set(a.userId, list);
  }

  const now = new Date();
  const people: PersonRow[] = enrollments.map((e) => {
    const since = e.cycleStartedAt;
    const done = new Set<string>();
    let last: Date | null = null;
    const touch = (d: Date) => {
      if (!last || d > last) last = d;
    };
    for (const p of progressByUser.get(e.userId) ?? []) {
      if (p.at >= since) {
        done.add(`l:${p.lessonId}`);
        touch(p.at);
      }
    }
    const best = new Map<string, number>();
    for (const a of attemptsByUser.get(e.userId) ?? []) {
      if (a.finishedAt < since) continue;
      touch(a.finishedAt);
      best.set(a.quizId, Math.max(best.get(a.quizId) ?? 0, a.score));
      if (a.passed) done.add(`q:${a.quizId}`);
    }
    const perModule = modules.map((m) => ({
      id: m.id,
      title: m.title,
      total: m.keys.length,
      done: m.keys.filter((k) => done.has(k)).length,
    }));
    const completed = perModule.reduce((n, m) => n + m.done, 0);
    const latest = e.certificates[0];
    return {
      enrollmentId: e.id,
      userId: e.userId,
      name: `${e.user.lastNames} ${e.user.firstNames}`,
      email: e.user.email,
      cedula: e.user.cedula,
      group: e.user.group?.name ?? null,
      extra: (e.user.extraFields ?? {}) as Record<string, string>,
      status: e.status,
      assignedAt: e.assignedAt,
      dueAt: e.dueAt,
      completedAt: e.completedAt,
      completed,
      total,
      percent: total === 0 ? 0 : Math.round((completed / total) * 100),
      modules: perModule,
      lastActivity: last,
      avgScore: avg([...best.values()]),
      overdue: !!e.dueAt && e.status !== "COMPLETED" && e.dueAt < now,
      cert: latest ? { ...latest, state: certState(latest.expiresAt, now) } : null,
    };
  });

  const certs = people.map((p) => p.cert?.state).filter(Boolean);
  const passedAttempts = attempts.filter((a) => a.passed).length;
  const summary = {
    enrolled: people.length,
    completed: people.filter((p) => p.status === "COMPLETED").length,
    inProgress: people.filter((p) => p.status === "IN_PROGRESS").length,
    notStarted: people.filter((p) => p.status === "ASSIGNED").length,
    avgPercent: avg(people.map((p) => p.percent)) ?? 0,
    overdue: people.filter((p) => p.overdue).length,
    certValid: certs.filter((s) => s === "valid" || s === "no_expiry").length,
    certExpiring: certs.filter((s) => s === "expiring").length,
    certExpired: certs.filter((s) => s === "expired").length,
    passRate: attempts.length ? Math.round((passedAttempts / attempts.length) * 100) : null,
  };

  const moduleStats = modules.map((m, i) => ({
    id: m.id,
    title: m.title,
    items: m.keys.length,
    completedPeople: people.filter((p) => p.modules[i].total > 0 && p.modules[i].done === p.modules[i].total).length,
    avgPercent:
      m.keys.length === 0 || people.length === 0
        ? 0
        : Math.round((people.reduce((n, p) => n + p.modules[i].done / m.keys.length, 0) / people.length) * 100),
  }));

  const quizzes: QuizStat[] = quizDefs.map(({ submodule, quiz }) => {
    const rows = attempts.filter((a) => a.quizId === quiz.id);
    const answerRate = quiz.questions.map((q) => {
      const correct = new Set(q.options.filter((o) => o.isCorrect).map((o) => o.id));
      let ok = 0;
      let seen = 0;
      for (const a of rows) {
        const chosen = (a.answers as Record<string, string[]> | null)?.[q.id];
        if (!chosen) continue;
        seen++;
        if (chosen.length === correct.size && chosen.every((id) => correct.has(id))) ok++;
      }
      return { id: q.id, text: q.text, correctRate: seen ? Math.round((ok / seen) * 100) : null };
    });
    return {
      submoduleId: submodule.id,
      title: submodule.title,
      passingScore: quiz.passingScore,
      attempts: rows.length,
      people: new Set(rows.map((r) => r.userId)).size,
      passRate: rows.length ? Math.round((rows.filter((r) => r.passed).length / rows.length) * 100) : null,
      avgScore: avg(rows.map((r) => r.score)),
      questions: answerRate,
    };
  });

  return {
    course: {
      id: course.id,
      title: course.title,
      published: course.published,
      progression: course.progression,
      recertMonths: course.recertMonths,
    },
    total,
    people,
    summary,
    moduleStats,
    quizzes,
    feedback: feedback.map((f) => ({
      name: `${f.user.firstNames} ${f.user.lastNames}`,
      comment: f.comment,
      createdAt: f.createdAt,
    })),
  };
}

// Reporte de todos los cursos (vista general y Excel).
export async function getAllReports(opts: { groupId?: string | null } = {}) {
  const courses = await getPrisma().course.findMany({ orderBy: { createdAt: "asc" }, select: { id: true } });
  const reports = await Promise.all(courses.map((c) => getCourseReport(c.id, opts)));
  return reports.filter((r): r is CourseReport => r !== null);
}
