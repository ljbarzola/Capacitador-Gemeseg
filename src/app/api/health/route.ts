import { getPrisma } from "@/lib/prisma";

// Comprobación de salud: responde 200 si la app y la base de datos están arriba.
export async function GET() {
  try {
    await getPrisma().$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", db: "up" });
  } catch {
    return Response.json({ status: "degraded", db: "down" }, { status: 503 });
  }
}
