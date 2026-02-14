import { defineConfig } from "drizzle-kit";

if (!process.env.SUPABASE_DATABASE_URL && !process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
  throw new Error("SUPABASE_DATABASE_URL, DATABASE_URL, or POSTGRES_URL is missing, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL!,
  },
});
