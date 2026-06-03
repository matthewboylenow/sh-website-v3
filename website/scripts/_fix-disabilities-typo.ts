import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { ministries } from "../db/schema";

async function main() {
  const rows = await db
    .select({ id: ministries.id, slug: ministries.slug, name: ministries.name, inquiryConfig: ministries.inquiryConfig })
    .from(ministries)
    .where(sql`${ministries.name} ILIKE '%Disabiliites%'`);
  if (rows.length === 0) {
    console.log("No matching ministry rows.");
    return;
  }
  for (const r of rows) {
    const newName = r.name.replace(/Disabiliites/g, "Disabilities");
    const newConfig = JSON.parse(
      JSON.stringify(r.inquiryConfig).replace(/Disabiliites/g, "Disabilities"),
    );
    await db
      .update(ministries)
      .set({ name: newName, inquiryConfig: newConfig, updatedAt: new Date() })
      .where(eq(ministries.id, r.id));
    console.log(`  fixed ${r.slug.padEnd(38)} "${r.name}" → "${newName}"`);
  }
  console.log(`\nFixed ${rows.length} row(s).`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
