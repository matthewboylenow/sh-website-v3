import type { InquiryField, MinistryInquiryConfig, SystemFieldKey } from "@/db/schema";

/**
 * Default system fields shown when a ministry hasn't configured `fields`
 * yet. Order matters — name + email first, phone, then message.
 */
export const DEFAULT_SYSTEM_FIELDS: InquiryField[] = [
  { kind: "system", systemKey: "name", label: "Your name", required: true, shown: true },
  { kind: "system", systemKey: "email", label: "Email", required: true, shown: true },
  { kind: "system", systemKey: "phone", label: "Phone (optional)", required: false, shown: true },
  {
    kind: "system",
    systemKey: "message",
    label: "Anything you'd like the leader to know? (optional)",
    required: false,
    shown: true,
  },
];

/** Locked system keys — name + email must always be shown and required;
 *  the inquiries table NOT NULLs them and they're how we reach back out. */
export const FORCED_SYSTEM_KEYS: SystemFieldKey[] = ["name", "email"];

/** HTML input type for each system field. */
export const SYSTEM_INPUT_TYPE: Record<SystemFieldKey, "text" | "email" | "tel" | "textarea"> = {
  name: "text",
  email: "email",
  phone: "tel",
  message: "textarea",
};

/** Resolve the field list to render — either the configured set or the
 *  four system defaults if nothing's been configured yet. */
export function resolveFields(config: MinistryInquiryConfig): InquiryField[] {
  if (config.fields && config.fields.length > 0) return config.fields;
  return DEFAULT_SYSTEM_FIELDS;
}

/** Stable id-ish for a field — used as the React key + form name. */
export function fieldKey(f: InquiryField): string {
  return f.kind === "system" ? `sys-${f.systemKey}` : `cf-${f.id}`;
}

/** Generate a short stable id for a new custom field. Uses crypto.randomUUID
 *  on the client; falls back to Math.random when running in older runtimes. */
export function newCustomFieldId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().slice(0, 8);
  }
  return Math.random().toString(36).slice(2, 10);
}
