/**
 * Runtime DB handle — used from Server Components, Route Handlers, and
 * any Node/Edge surface inside the Next.js app.
 *
 * Uses @neondatabase/serverless so the same handle works on Edge
 * (Fathom's USCCB readings proxy) and Node runtimes. CLI scripts
 * (seed / check / migrate) load .env.local via tsx --env-file; this
 * module relies on DATABASE_URL being present in process.env.
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Check .env.local or Vercel env vars.",
  );
}

const sql = neon(process.env.DATABASE_URL);

export const db = drizzle(sql, { schema });
export { schema };
