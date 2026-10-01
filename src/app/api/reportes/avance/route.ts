import ExcelJS from "exceljs";
import { CERT_STATE_LABEL } from "@/lib/certificates";
import { getSessionUser, isStaff } from "@/lib/dal";
import { getActiveFields } from "@/lib/registration-fields";
import { getAllReports, getCourseReport, type CourseReport } from "@/lib/stats";

// Reporte de avance en Excel (solo personal). ?curso=<id> limita a un curso; ?grupo=<id> filtra por grupo.
const STATUS = { ASSIGNED: "Sin iniciar", IN_PROGRESS: "En curso", COMPLETED: "Completado" } as const;

function header(sheet: ExcelJS.Worksheet) {
  const row = sheet.getRow(1);
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF100F31" } };
  row.alignment = { vertical: "middle", wrapText: true };
  row.height = 28;
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columnCount } };
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user || !isStaff(user.role)) return new Response("No autorizado", { status: 403 });

  const url = new URL(request.url);
  const courseId = url.searchParams.get("curso");
  const groupId = url.searchParams.get("grupo") || null;

  let reports: CourseReport[];
  if (courseId) {
    const report = await getCourseReport(courseId, { groupId });
    if (!report) return new Response("Curso no encontrado", { status: 404 });
    reports = [report];
  } else {
    reports = await getAllReports({ groupId });
  }

  const extraFields = await getActiveFields();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Capacitación Gemeseg";
  workbook.created = new Date();

  const summary = workbook.addWorksheet("Resumen por curso");
  summary.columns = [
    { header: "Curso", key: "course", width: 46 },
    { header: "Publicado", key: "published", width: 11 },
    { header: "Inscritos", key: "enrolled", width: 11 },
    { header: "Completaron", key: "completed", width: 13 },
    { header: "En curso", key: "inProgress", width: 10 },
    { header: "Sin iniciar", key: "notStarted", width: 12 },
    { header: "Avance promedio (%)", key: "avg", width: 18 },
    { header: "Atrasados", key: "overdue", width: 11 },
    { header: "Aprobación de exámenes (%)", key: "pass", width: 22 },
    { header: "Certificados vigentes", key: "valid", width: 20 },
    { header: "Por vencer", key: "expiring", width: 12 },
    { header: "Vencidos", key: "expired", width: 10 },
  ];
  for (const r of reports) {
    summary.addRow({
      course: r.course.title,
      published: r.course.published ? "Sí" : "No",
      enrolled: r.summary.enrolled,
      completed: r.summary.completed,
      inProgress: r.summary.inProgress,
      notStarted: r.summary.notStarted,
      avg: r.summary.avgPercent,
      overdue: r.summary.overdue,
      pass: r.summary.passRate ?? "",
      valid: r.summary.certValid,
      expiring: r.summary.certExpiring,
      expired: r.summary.certExpired,
    });
  }
  header(summary);

  const detail = workbook.addWorksheet("Detalle por persona");
  detail.columns = [
    { header: "Curso", key: "course", width: 40 },
    { header: "Apellidos y nombres", key: "name", width: 34 },
    { header: "Cédula", key: "cedula", width: 13 },
    { header: "Correo", key: "email", width: 32 },
    { header: "Grupo", key: "group", width: 20 },
    { header: "Estado", key: "status", width: 13 },
    { header: "Avance (%)", key: "percent", width: 11 },
    { header: "Actividades", key: "acts", width: 13 },
    { header: "Sesiones en vivo cumplidas", key: "sess", width: 22 },
    { header: "Nota media (%)", key: "score", width: 14 },
    { header: "Asignado", key: "assigned", width: 12 },
    { header: "Fecha límite", key: "due", width: 12 },
    { header: "Último movimiento", key: "last", width: 18 },
    { header: "Completado", key: "done", width: 12 },
    { header: "Certificado", key: "code", width: 15 },
    { header: "Estado del certificado", key: "certState", width: 22 },
    { header: "Emitido", key: "issued", width: 12 },
    { header: "Vence", key: "expires", width: 12 },
    ...extraFields.map((f) => ({ header: f.label, key: `extra_${f.key}`, width: 20 })),
  ];
  for (const r of reports) {
    for (const p of r.people) {
      detail.addRow({
        course: r.course.title,
        name: p.name,
        cedula: p.cedula,
        email: p.email,
        group: p.group ?? "",
        status: p.overdue ? "Atrasado" : STATUS[p.status],
        percent: p.percent,
        acts: `${p.completed} de ${p.total}`,
        sess: r.sessions.length ? `${p.sessionsDone} de ${r.sessions.length}` : "",
        score: p.avgScore ?? "",
        assigned: p.assignedAt,
        due: p.dueAt ?? "",
        last: p.lastActivity ?? "",
        done: p.completedAt ?? "",
        code: p.cert?.code ?? "",
        certState: p.cert ? CERT_STATE_LABEL[p.cert.state] : "",
        issued: p.cert?.issuedAt ?? "",
        expires: p.cert?.expiresAt ?? (p.cert ? "Sin vencimiento" : ""),
        ...Object.fromEntries(extraFields.map((f) => [`extra_${f.key}`, p.extra[f.key] ?? ""])),
      });
    }
  }
  for (const key of ["assigned", "due", "done", "issued", "expires"]) detail.getColumn(key).numFmt = "dd/mm/yyyy";
  detail.getColumn("last").numFmt = "dd/mm/yyyy hh:mm";
  header(detail);

  const quizzes = workbook.addWorksheet("Exámenes");
  quizzes.columns = [
    { header: "Curso", key: "course", width: 40 },
    { header: "Examen (submódulo)", key: "quiz", width: 36 },
    { header: "Pregunta", key: "question", width: 60 },
    { header: "Respuestas correctas (%)", key: "rate", width: 22 },
    { header: "Intentos del examen", key: "attempts", width: 18 },
    { header: "Aprobación del examen (%)", key: "pass", width: 22 },
    { header: "Nota media (%)", key: "avg", width: 14 },
  ];
  for (const r of reports) {
    for (const q of r.quizzes) {
      for (const question of q.questions) {
        quizzes.addRow({
          course: r.course.title,
          quiz: q.title,
          question: question.text,
          rate: question.correctRate ?? "",
          attempts: q.attempts,
          pass: q.passRate ?? "",
          avg: q.avgScore ?? "",
        });
      }
    }
  }
  header(quizzes);

  const sessions = workbook.addWorksheet("Sesiones en vivo");
  sessions.columns = [
    { header: "Curso", key: "course", width: 40 },
    { header: "Sesión", key: "session", width: 36 },
    { header: "Fecha y hora", key: "when", width: 18 },
    { header: "Instructor", key: "instructor", width: 28 },
    { header: "Asistieron", key: "attended", width: 12 },
    { header: "Justificadas", key: "excused", width: 13 },
    { header: "No asistieron", key: "absent", width: 14 },
    { header: "Sin marcar", key: "unmarked", width: 12 },
  ];
  for (const r of reports) {
    for (const s of r.sessions) {
      sessions.addRow({
        course: r.course.title,
        session: s.title,
        when: s.startsAt ?? "",
        instructor: s.instructor ?? "",
        attended: s.attended,
        excused: s.excused,
        absent: s.absent,
        unmarked: s.unmarked,
      });
    }
  }
  sessions.getColumn("when").numFmt = "dd/mm/yyyy hh:mm";
  header(sessions);

  const buffer = await workbook.xlsx.writeBuffer();
  const stamp = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Guayaquil" });
  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="avance-capacitaciones-${stamp}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}
