// Prisma configuration for local development and production deployments.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  engine: "classic",
  datasource: {
    // Keep Prisma Client generation working during dependency installation
    // even when DATABASE_URL is not available yet. Migration commands still
    // require a real DATABASE_URL at runtime.
    url: process.env.DATABASE_URL ?? "postgresql://localhost:5432/placeholder",
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
