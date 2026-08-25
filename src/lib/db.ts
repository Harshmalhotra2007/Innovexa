import { PrismaClient } from "@prisma/client";

const defaultDbUrl =
  "postgresql://neondb_owner:npg_BXegrH4MAR8o@ep-crimson-band-b3rraxu3-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== ""
          ? process.env.DATABASE_URL
          : defaultDbUrl,
      },
    },
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
