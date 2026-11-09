import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; pragmasDone?: boolean };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

// SQLite : mode WAL (lectures pendant les écritures) et attente en cas de verrou.
if (!globalForPrisma.pragmasDone) {
  globalForPrisma.pragmasDone = true;
  db.$queryRawUnsafe("PRAGMA journal_mode = WAL;")
    .then(() => db.$queryRawUnsafe("PRAGMA busy_timeout = 5000;"))
    .catch(() => {});
}
