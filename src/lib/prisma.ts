import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Reutiliza la instancia en desarrollo para no agotar conexiones con el hot reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Se crea al primer uso (no al importar) para que `next build` funcione sin DATABASE_URL.
export function getPrisma(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL no está definida");
  }
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  globalForPrisma.prisma = client;
  return client;
}
