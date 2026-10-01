import { toCsv } from "@/lib/csv";
import { getSessionUser } from "@/lib/dal";
import { getActiveFields } from "@/lib/registration-fields";

// Plantilla CSV para importar usuarios (solo administradores).
export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") return new Response("No autorizado", { status: 403 });

  const fields = await getActiveFields();
  const header = ["cedula", "nombres", "apellidos", "correo", "grupo", ...fields.map((f) => f.label)];
  const example = ["0912345678", "María Fernanda", "Quishpe Villacís", "maria.quishpe@ejemplo.com", "Sede Quito", ...fields.map((f) => (f.type === "SELECT" ? (f.options[0] ?? "") : ""))];
  return new Response(toCsv([header, example]), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="plantilla-usuarios.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
