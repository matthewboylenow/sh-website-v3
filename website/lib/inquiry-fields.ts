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

/**
 * Minimal fields for the "Ask a Question" / inquire flow — always the
 * same four system slots regardless of the ministry's custom field
 * config. Questions are generic; volunteer-specific dropdowns or
 * subcommittee checkboxes only get in the way. Message is required
 * here (unlike the default) because a question with no body is noise.
 */
export const INQUIRE_QUESTION_FIELDS: InquiryField[] = [
  { kind: "system", systemKey: "name", label: "Your name", required: true, shown: true },
  { kind: "system", systemKey: "email", label: "Email", required: true, shown: true },
  { kind: "system", systemKey: "phone", label: "Phone (optional)", required: false, shown: true },
  {
    kind: "system",
    systemKey: "message",
    label: "What's your question?",
    required: true,
    shown: true,
  },
];

/**
 * Resolve fields for a given button kind. The "inquire" kind always
 * gets the minimal question form; other kinds (volunteer/join) get
 * the ministry's full configured fields.
 */
export function resolveFieldsForKind(
  config: MinistryInquiryConfig,
  kind: MinistryInquiryConfig["buttons"][number]["kind"],
): InquiryField[] {
  if (kind === "inquire") return INQUIRE_QUESTION_FIELDS;
  return resolveFields(config);
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
