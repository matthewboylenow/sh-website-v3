/**
 * One-off: apply db/migrations/0024_answer_engine.sql over Neon's HTTP
 * driver (this environment can't reach Postgres on :5432, which is what
 * `drizzle-kit migrate` uses) and record it in drizzle.__drizzle_migrations
 * exactly as drizzle's migrator would — hash = sha256 of the file,
 * created_at = the journal's `when` — so future `pnpm db:migrate` runs
 * see it as applied.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";

const JOURNAL_WHEN = 1785600000000; // 0024_answer_engine in meta/_journal.json

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const file = path.join(__dirname, "..", "db", "migrations", "0024_answer_engine.sql");
  const content = readFileSync(file, "utf8");
  const hash = createHash("sha256").update(content).digest("hex");

  // Guard: skip if already recorded.
  const applied = await sql`
    select 1 from drizzle.__drizzle_migrations where created_at = ${JOURNAL_WHEN} limit 1`;
  if (applied.length > 0) {
    console.log("0024 already recorded as applied — nothing to do.");
    return;
  }
  const tables = await sql`
    select table_name from information_schema.tables
    where table_schema = 'public' and table_name like 'answer%'`;
  if (tables.length > 0) {
    throw new Error(
      `answer_* tables already exist (${tables.map((t) => t.table_name).join(", ")}) but 0024 isn't recorded — resolve manually.`,
    );
  }

  const statements = content
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);
  console.log(`Applying 0024_answer_engine.sql — ${statements.length} statements`);
  for (const [i, stmt] of statements.entries()) {
    await sql.query(stmt);
    console.log(`  ✓ statement ${i + 1}/${statements.length}`);
  }

  await sql`
    insert into drizzle.__drizzle_migrations (hash, created_at)
    values (${hash}, ${JOURNAL_WHEN})`;
  console.log(`Recorded in drizzle.__drizzle_migrations (hash ${hash.slice(0, 12)}…, when ${JOURNAL_WHEN})`);

  const check = await sql`
    select table_name from information_schema.tables
    where table_schema = 'public' and table_name like 'answer%' order by table_name`;
  console.log("answer tables now:", check.map((t) => t.table_name).join(", "));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
