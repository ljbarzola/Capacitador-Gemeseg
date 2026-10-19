import { notFound } from "next/navigation";
import { getCourseAccess } from "@/lib/dal";
import { getOutline, getOutlineCached, persistLegacyModules, syncEnrollment } from "@/lib/progress";
import { CourseSidebar } from "./course-sidebar";

export default async function CourseLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const { user, preview, enrollment } = await getCourseAccess(courseId);
  let outline = await getOutlineCached(courseId, preview ? null : user.id);
  if (!outline) notFound();
  // Cubre avances anteriores a la finalización automática: un módulo ya terminado se finaliza (y
  // certifica) y un curso con todos los módulos finalizados se completa al abrirlo.
  if (!preview) {
    const current = outline.modules.find((m) => m.id === outline!.currentModuleId);
    const pending = (current?.ready && !current.finalized) || (outline.complete && enrollment?.status !== "COMPLETED");
    if (pending) {
      await syncEnrollment(user.id, courseId);
      outline = (await getOutline(courseId, user.id)) ?? outline;
    }
  }
  // Quien ya venía avanzado recibe sus módulos terminados como finalizados (y su certificado).
  if (!preview) await persistLegacyModules(user.id, courseId, outline);

  return (
    <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
      {preview && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-950 lg:col-span-2">
          Vista previa para el personal: su avance y los resultados de exámenes no se guardan.
          {!outline.course.published && " Este curso aún no está publicado."}
        </p>
      )}
      <details className="rounded-2xl border border-zinc-200 bg-white p-4 lg:hidden">
        <summary className="cursor-pointer font-semibold text-navy">Contenido del curso</summary>
        <div className="mt-4">
          <CourseSidebar outline={outline} preview={preview} />
        </div>
      </details>
      <aside className="hidden lg:block">
        <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-4">
          <CourseSidebar outline={outline} preview={preview} />
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
