"use server";

import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { editorFields } from "@/lib/audit";
import {
  SiteSettingsGeneralSchema,
  SiteSettingsGivingSchema,
} from "@/lib/validators/site-settings";
import { FORBIDDEN_ADMIN_ONLY, canAdminister } from "@/lib/authz";

type ActionResult =
  | { ok: true }
  | { ok: false; fieldErrors: Record<string, string[]> }
  | { ok: false; error: string };

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: "Not signed in" };
  if (!canAdminister(session.user.role))
    return { ok: false as const, error: FORBIDDEN_ADMIN_ONLY };
  return { ok: true as const };
}

function parseGeneralForm(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v.trim() : "";
  };
  const splitEmails = (raw: string) =>
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  const recipients = splitEmails(get("welcomeFormRecipients"));
  const funeralRecipients = splitEmails(get("funeralFormRecipients"));
  const baptismRecipients = splitEmails(get("baptismFormRecipients"));
  const ociaRecipients = splitEmails(get("ociaFormRecipients"));
  const prayerRecipients = splitEmails(get("prayerFormRecipients"));
  return {
    contactEmail: get("contactEmail"),
    contactPhone: get("contactPhone") || null,
    address: {
      street: get("address.street"),
      city: get("address.city"),
      state: get("address.state"),
      zip: get("address.zip"),
    },
    socialLinks: {
      facebook: get("socialLinks.facebook") || null,
      youtube: get("socialLinks.youtube") || null,
      instagram: get("socialLinks.instagram") || null,
    },
    welcomeFormRecipients: recipients,
    funeralFormRecipients: funeralRecipients,
    baptismFormRecipients: baptismRecipients,
    ociaFormRecipients: ociaRecipients,
    prayerFormRecipients: prayerRecipients,
    logoBlobKey: get("logoBlobKey") || null,
    logoAlt: get("logoAlt") || null,
    faviconBlobKey: get("faviconBlobKey") || null,
    appleTouchIconBlobKey: get("appleTouchIconBlobKey") || null,
    footerCopy: get("footerCopy") || null,
    bottomBarHtml: get("bottomBarHtml") || null,
    densityScale: get("densityScale") || "1.00",
  };
}

export async function updateSiteSettingsGeneralAction(
  formData: FormData,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const parsed = SiteSettingsGeneralSchema.safeParse(parseGeneralForm(formData));
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    await db
      .update(siteSettings)
      .set({
        contactEmail: parsed.data.contactEmail,
        contactPhone: parsed.data.contactPhone,
        address: parsed.data.address,
        socialLinks: {
          facebook: parsed.data.socialLinks.facebook || undefined,
          youtube: parsed.data.socialLinks.youtube || undefined,
          instagram: parsed.data.socialLinks.instagram || undefined,
        },
        welcomeFormRecipients: parsed.data.welcomeFormRecipients,
        funeralFormRecipients: parsed.data.funeralFormRecipients,
        baptismFormRecipients: parsed.data.baptismFormRecipients,
        logoBlobKey: parsed.data.logoBlobKey,
        logoAlt: parsed.data.logoAlt,
        faviconBlobKey: parsed.data.faviconBlobKey,
        appleTouchIconBlobKey: parsed.data.appleTouchIconBlobKey,
        footerCopy: parsed.data.footerCopy,
        bottomBarHtml: parsed.data.bottomBarHtml,
        densityScale: parsed.data.densityScale,
        updatedAt: new Date(),
        ...(await editorFields()),
      })
      .where(eq(siteSettings.id, 1));
    revalidateTag("site-settings");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Database error" };
  }
}

function parseGivingForm(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v.trim() : "";
  };
  const designations = decodeRepeated(formData, "designations").map((row) => ({
    label: row.label ?? "",
    url: row.url ?? "",
  }));
  const seasonal = decodeRepeated(formData, "seasonal").map((row) => ({
    label: row.label ?? "",
    url: row.url ?? "",
    activeFrom: row.activeFrom ?? "",
    activeUntil: row.activeUntil ?? "",
  }));
  return {
    primaryUrl: get("primaryUrl"),
    recurringUrl: get("recurringUrl") || null,
    designations,
    seasonal,
  };
}

/**
 * The repeatable rows in the form use names like designations[0].label,
 * designations[0].url, designations[1].label, … — collect them into an
 * array of objects keyed by the field name.
 */
function decodeRepeated(formData: FormData, prefix: string): Record<string, string>[] {
  const result: Record<string, string>[] = [];
  for (const [key, value] of formData.entries()) {
    const m = key.match(new RegExp(`^${prefix}\\[(\\d+)\\]\\.(\\w+)$`));
    if (!m || typeof value !== "string") continue;
    const idx = Number(m[1]);
    const field = m[2]!;
    result[idx] ??= {};
    result[idx][field] = value.trim();
  }
  // Drop holes (sparse from removed rows) and any row with empty url+label.
  return result.filter(
    (r) => r && Object.values(r).some((v) => typeof v === "string" && v.length > 0),
  );
}

export async function updateSiteSettingsGivingAction(
  formData: FormData,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const parsed = SiteSettingsGivingSchema.safeParse(parseGivingForm(formData));
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    await db
      .update(siteSettings)
      .set({
        giving: {
          primaryUrl: parsed.data.primaryUrl,
          recurringUrl: parsed.data.recurringUrl || undefined,
          designations: parsed.data.designations,
          seasonal: parsed.data.seasonal,
        },
        updatedAt: new Date(),
        ...(await editorFields()),
      })
      .where(eq(siteSettings.id, 1));
    revalidateTag("site-settings");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Database error" };
  }
}
