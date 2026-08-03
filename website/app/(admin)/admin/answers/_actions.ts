"use server";

import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { answerCards } from "@/db/schema";
import { editorFields } from "@/lib/audit";
import { filterLinks } from "@/lib/answers/blocklist";
import { canAdminister, canWriteContent, FORBIDDEN } from "@/lib/authz";
import {
  AnswerCardSchema,
  linesToList,
  type AnswerCardInput,
} from "@/lib/validators/answer-cards";

type ActionResult =
  | { ok: true; id: string }
  | { ok: false; fieldErrors: Record<string, string[]> }
  | { ok: false; error: string };

async function requireWriter() {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: "Not signed in" };
  if (!canWriteContent(session.user.role))
    return { ok: false as const, error: FORBIDDEN };
  return { ok: true as const, session };
}

/**
 * The one place the rule lives: a card touching grief, loss or crisis cannot
 * go live without somebody who may review it saying so.
 *
 * An editor who marks a card pastoral and tries to publish gets it parked in
 * review instead — silently downgraded rather than rejected, because the
 * work they did is still worth keeping.
 */
function resolveStatus(
  requested: AnswerCardInput["status"],
  pastoral: boolean,
  canReview: boolean,
): AnswerCardInput["status"] {
  if (requested === "published" && pastoral && !canReview) return "review";
  return requested;
}

function parseForm(formData: FormData): unknown {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v.trim() : "";
  };

  const links = safeJson<{ label: string; url: string }[]>(get("links"), []);
  const moments = safeJson<unknown[]>(get("moments"), []);

  const activationRule = get("activationRule");

  return {
    key: get("key"),
    title: get("title"),
    answer: get("answer"),
    group: get("group"),
    triggers: linesToList(get("triggers")),
    links,
    moments,
    contact: get("contact"),
    pastoral: formData.get("pastoral") === "on",
    activation: activationRule
      ? {
          rule: activationRule,
          leadDays: get("activationLead") || 0,
          trailDays: get("activationTrail") || 0,
        }
      : null,
    status: get("status") || "draft",
    note: get("note"),
    position: get("position") || 0,
  };
}

function safeJson<T>(raw: string, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeCard(
  id: string | null,
  formData: FormData,
): Promise<ActionResult> {
  const guard = await requireWriter();
  if (!guard.ok) return guard;

  const parsed = AnswerCardSchema.safeParse(parseForm(formData));
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  const data = parsed.data;
  const status = resolveStatus(
    data.status,
    data.pastoral,
    canAdminister(guard.session.user.role),
  );

  // Blocked links can never be stored, let alone shown. Enforced here as
  // well as at render, so adding a rule later hides links already saved.
  const links = filterLinks(BLOCK_RULES, data.links);

  const values = {
    key: data.key,
    title: data.title,
    answer: data.answer,
    group: data.group,
    triggers: data.triggers,
    links,
    moments: data.moments,
    contact: data.contact,
    pastoral: data.pastoral,
    activation: data.activation,
    status,
    note: data.note,
    position: data.position,
    updatedAt: new Date(),
    ...(await editorFields()),
  };

  try {
    const row = id
      ? (
          await db
            .update(answerCards)
            .set(values)
            .where(eq(answerCards.id, id))
            .returning({ id: answerCards.id })
        )[0]
      : (
          await db
            .insert(answerCards)
            .values(values)
            .returning({ id: answerCards.id })
        )[0];

    if (!row) return { ok: false, error: "Card not found" };
    revalidateTag("answer-cards");
    return { ok: true, id: row.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Database error";
    const constraint = (err as { cause?: { constraint?: string } }).cause
      ?.constraint;
    if (constraint === "answer_cards_key_uq" || msg.includes("answer_cards_key_uq")) {
      return {
        ok: false,
        error: `A card with the key "${data.key}" already exists.`,
      };
    }
    return { ok: false, error: msg };
  }
}

/** Kept in step with lib/answers/corpus.query.ts. */
const BLOCK_RULES = [
  {
    url: "https://sainthelen.org/baptism/",
    reason:
      "Baptism form. Sent privately after a conversation. Must never be discoverable.",
    match: "children" as const,
  },
];

export async function createAnswerCardAction(
  formData: FormData,
): Promise<ActionResult> {
  return writeCard(null, formData);
}

export async function updateAnswerCardAction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  return writeCard(id, formData);
}

export async function setAnswerCardStatusAction(
  id: string,
  status: AnswerCardInput["status"],
): Promise<ActionResult> {
  const guard = await requireWriter();
  if (!guard.ok) return guard;

  const [existing] = await db
    .select({ pastoral: answerCards.pastoral })
    .from(answerCards)
    .where(eq(answerCards.id, id))
    .limit(1);
  if (!existing) return { ok: false, error: "Card not found" };

  if (
    status === "published" &&
    existing.pastoral &&
    !canAdminister(guard.session.user.role)
  ) {
    return {
      ok: false,
      error:
        "This card is marked pastoral. An administrator needs to read it before it goes live.",
    };
  }

  const [row] = await db
    .update(answerCards)
    .set({ status, updatedAt: new Date(), ...(await editorFields()) })
    .where(eq(answerCards.id, id))
    .returning({ id: answerCards.id });
  if (!row) return { ok: false, error: "Card not found" };
  revalidateTag("answer-cards");
  return { ok: true, id: row.id };
}

export async function deleteAnswerCardAndRedirect(id: string) {
  const guard = await requireWriter();
  if (!guard.ok) return;
  await db.delete(answerCards).where(eq(answerCards.id, id));
  revalidateTag("answer-cards");
  redirect("/admin/answers");
}
