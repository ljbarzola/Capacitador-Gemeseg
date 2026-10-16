import { IconAward } from "@/components/icons";
import { Button } from "@/components/ui";
import { finishModule } from "./actions";

// Botón «Finalizar módulo»: se muestra cuando la persona terminó todas las actividades del módulo.
export function FinishModuleForm({
  courseId,
  moduleId,
  last,
  issuesCertificate,
}: {
  courseId: string;
  moduleId: string;
  last: boolean;
  issuesCertificate: boolean;
}) {
  return (
    <form action={finishModule}>
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="moduleId" value={moduleId} />
      <Button type="submit" className="min-h-11 w-full px-5 sm:w-auto">
        {issuesCertificate && <IconAward width={18} height={18} aria-hidden />}
        {last ? "Finalizar módulo y curso" : "Finalizar módulo"}
      </Button>
    </form>
  );
}
