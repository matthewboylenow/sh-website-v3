import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit is a CLI — Next.js's automatic env loading doesn't apply.
config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set — check .env.local");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dbCredentials: { url: process.env.DATABASE_URL },
  strict: true,
  verbose: true,
});
