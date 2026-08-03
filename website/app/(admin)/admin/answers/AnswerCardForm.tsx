"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { AdminField } from "@/components/admin/AdminField";
import { LITURGICAL_RULES, MOMENT_AFTER } from "@/lib/answers/types";
import type { AnswerCardRow } from "@/db/schema";
import {
  createAnswerCardAction,
  updateAnswerCardAction,
} from "./_actions";

/**
 * The card editor.
 *
 * Carries an unsaved-changes guard, which nothing else in this admin has
 * yet. Losing twenty minutes of writing to a stray click on the sidebar is
 * the most predictable support call in the whole product.
 */

const RULE_LABELS: Record<string, string> = {
  ash_wednesday: "Ash Wednesday",
  palm_sunday: "Palm Sunday",
  holy_thursday: "Holy Thursday",
  good_friday: "Good Friday",
  easter: "Easter",
  pentecost: "Pentecost",
  advent_start: "First Sunday of Advent",
  christmas: "Christmas",
  immaculate: "Immaculate Conception",
  all_saints: "All Saints",
  all_souls: "All Souls",
};

const AFTER_LABELS: Record<string, string> = {
  drop: "Forget it — the line disappears, the card stays",
  note: "Note it — “X has already taken place”",
  archive: "Archive — the whole card leaves search the day after",
  roll: "Roll forward — moves to its next occurrence",
};

type Moment = {
  label: string;
  when: string;
  where: string;
  after: string;
  rule: string;
};

type LinkRow = { label: string; url: string };

export function AnswerCardForm({
  mode,
  card,
}: {
  mode: "create" | "edit";
  card?: AnswerCardRow;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [topError, setTopError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const [links, setLinks] = useState<LinkRow[]>(
    (card?.links as LinkRow[] | undefined) ?? [],
  );
  const [moments, setMoments] = useState<Moment[]>(
    ((card?.moments as Moment[] | undefined) ?? []).map((m) => ({ ...m })),
  );
  const [seasonal, setSeasonal] = useState(Boolean(card?.activation));
  const [pastoral, setPastoral] = useState(Boolean(card?.pastoral));

  const formRef = useRef<HTMLFormElement | null>(null);

  // Warn before leaving with unsaved work.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const onSubmit = (formData: FormData) => {
    setErrors({});
    setTopError(null);
    formData.set("links", JSON.stringify(links.filter((l) => l.url.trim())));
    formData.set(
      "moments",
      JSON.stringify(moments.filter((m) => m.when.trim())),
    );
    start(async () => {
      const result =
        mode === "create"
          ? await createAnswerCardAction(formData)
          : await updateAnswerCardAction(card!.id, formData);
      if (result.ok) {
        setDirty(false);
        router.push(`/admin/answers/${result.id}?saved=1`);
        router.refresh();
        return;
      }
      if ("fieldErrors" in result) setErrors(result.fieldErrors);
      else setTopError(result.error);
    });
  };

  return (
    <form
      ref={formRef}
      action={onSubmit}
      onChange={() => setDirty(true)}
      className="grid gap-8 lg:grid-cols-[2fr_1fr]"
    >
      <div className="space-y-5">
        {topError && (
          <div className="rounded-md border-l-4 border-rust bg-rust-pale px-4 py-3 text-sm text-rust-dark">
            {topError}
          </div>
        )}

        <AdminField name="title" label="Title" required errors={errors.title}>
          <input
            name="title"
            type="text"
            defaultValue={card?.title ?? ""}
            required
            maxLength={160}
            className="form-input"
          />
        </AdminField>

        <AdminField
          name="key"
          label="Key"
          required
          hint="Short and stable, e.g. mass-times. Used in reports, so changing it later loses the history."
          errors={errors.key}
        >
          <input
            name="key"
            type="text"
            defaultValue={card?.key ?? ""}
            required
            maxLength={80}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            className="form-input font-mono text-sm"
          />
        </AdminField>

        <AdminField
          name="answer"
          label="Answer"
          required
          hint="Write it the way you would say it out loud. One blank line between paragraphs."
          errors={errors.answer}
        >
          <textarea
            name="answer"
            defaultValue={card?.answer ?? ""}
            required
            rows={8}
            maxLength={8000}
            className="form-input"
          />
        </AdminField>

        <AdminField
          name="triggers"
          label="Things people type"
          required
          hint="One per line. Include the misspellings you actually see — “masd”, “bulliten”, “conformation”. This is what makes the card findable."
          errors={errors.triggers}
        >
          <textarea
            name="triggers"
            defaultValue={(card?.triggers ?? []).join("\n")}
            required
            rows={7}
            className="form-input font-mono text-sm"
          />
        </AdminField>

        {/* ---- Links ---------------------------------------------- */}
        <fieldset className="rounded-lg border border-rule bg-white p-5">
          <legend className="px-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink-3">
            Links
          </legend>
          <div className="space-y-2">
            {links.map((l, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={l.label}
                  placeholder="Label"
                  onChange={(e) => {
                    const next = [...links];
                    next[i] = { ...l, label: e.target.value };
                    setLinks(next);
                    setDirty(true);
                  }}
                  className="form-input flex-1 text-sm"
                />
                <input
                  type="text"
                  value={l.url}
                  placeholder="/mass or https://…"
                  onChange={(e) => {
                    const next = [...links];
                    next[i] = { ...l, url: e.target.value };
                    setLinks(next);
                    setDirty(true);
                  }}
                  className="form-input flex-1 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    setLinks(links.filter((_, j) => j !== i));
                    setDirty(true);
                  }}
                  className="rounded-md px-2 text-sm text-ink-3 hover:text-rust-dark"
                  aria-label={`Remove link ${i + 1}`}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setLinks([...links, { label: "", url: "" }]);
              setDirty(true);
            }}
            className="mt-3 text-sm font-semibold text-rust-dark hover:text-rust"
          >
            + Add link
          </button>
        </fieldset>

        {/* ---- Moments -------------------------------------------- */}
        <fieldset className="rounded-lg border border-rule bg-white p-5">
          <legend className="px-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink-3">
            Dated lines
          </legend>
          <p className="mb-3 text-xs text-ink-3">
            A meeting, a deadline, a feast. Say what should happen once the date
            passes and the card will look after itself.
          </p>
          <div className="space-y-4">
            {moments.map((m, i) => (
              <div key={i} className="rounded-md border border-rule p-3">
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={m.label}
                    placeholder="Information meeting"
                    onChange={(e) => updateMoment(i, { label: e.target.value })}
                    className="form-input flex-1 text-sm"
                  />
                  <input
                    type="text"
                    value={m.when}
                    placeholder="2027-02-10 or 2027-02-10T19:00"
                    onChange={(e) => updateMoment(i, { when: e.target.value })}
                    className="form-input w-56 font-mono text-sm"
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={m.where}
                    placeholder="the Church"
                    onChange={(e) => updateMoment(i, { where: e.target.value })}
                    className="form-input flex-1 text-sm"
                  />
                  <select
                    value={m.after}
                    onChange={(e) => updateMoment(i, { after: e.target.value })}
                    className="form-input flex-1 text-sm"
                  >
                    {MOMENT_AFTER.map((a) => (
                      <option key={a} value={a}>
                        {AFTER_LABELS[a]}
                      </option>
                    ))}
                  </select>
                </div>
                {m.after === "roll" && (
                  <select
                    value={m.rule}
                    onChange={(e) => updateMoment(i, { rule: e.target.value })}
                    className="form-input mt-2 w-full text-sm"
                  >
                    <option value="">Same date each year</option>
                    {LITURGICAL_RULES.map((r) => (
                      <option key={r} value={r}>
                        {RULE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMoments(moments.filter((_, j) => j !== i));
                    setDirty(true);
                  }}
                  className="mt-2 text-xs text-ink-3 hover:text-rust-dark"
                >
                  Remove this line
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setMoments([
                ...moments,
                { label: "", when: "", where: "", after: "drop", rule: "" },
              ]);
              setDirty(true);
            }}
            className="mt-3 text-sm font-semibold text-rust-dark hover:text-rust"
          >
            + Add a dated line
          </button>
        </fieldset>
      </div>

      {/* ---- Sidebar --------------------------------------------- */}
      <aside className="space-y-5">
        <div className="rounded-lg border border-rule bg-white p-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-3">
            Status
          </h3>
          <div className="mt-3 space-y-2 text-sm">
            {(["draft", "review", "published", "archived"] as const).map((s) => (
              <label key={s} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="status"
                  value={s}
                  defaultChecked={(card?.status ?? "draft") === s}
                />
                <span>
                  {s === "review" ? "Needs reading" : s[0]!.toUpperCase() + s.slice(1)}
                </span>
              </label>
            ))}
          </div>
          {pastoral && (
            <p className="mt-3 rounded bg-[#F6EEDC] px-3 py-2 text-xs text-[#7A5E12]">
              This card is marked pastoral. If you are not an administrator,
              choosing Published will park it in Needs reading instead.
            </p>
          )}
        </div>

        <div className="rounded-lg border border-rule bg-white p-5">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              name="pastoral"
              defaultChecked={pastoral}
              onChange={(e) => {
                setPastoral(e.target.checked);
                setDirty(true);
              }}
              className="mt-1"
            />
            <span>
              <span className="font-semibold">Pastoral</span>
              <span className="mt-0.5 block text-xs text-ink-3">
                Grief, loss, crisis. Needs a person to read it before it can
                answer anybody.
              </span>
            </span>
          </label>
        </div>

        <div className="rounded-lg border border-rule bg-white p-5">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={seasonal}
              onChange={(e) => {
                setSeasonal(e.target.checked);
                setDirty(true);
              }}
              className="mt-1"
            />
            <span>
              <span className="font-semibold">Only in season</span>
              <span className="mt-0.5 block text-xs text-ink-3">
                Otherwise the Christmas card is findable in June.
              </span>
            </span>
          </label>

          {seasonal && (
            <div className="mt-3 space-y-2">
              <select
                name="activationRule"
                defaultValue={card?.activation?.rule ?? "christmas"}
                className="form-input w-full text-sm"
              >
                {LITURGICAL_RULES.map((r) => (
                  <option key={r} value={r}>
                    {RULE_LABELS[r]}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <label className="flex-1 text-xs text-ink-3">
                  Days before
                  <input
                    name="activationLead"
                    type="number"
                    min={0}
                    max={365}
                    defaultValue={card?.activation?.leadDays ?? 21}
                    className="form-input mt-1 w-full text-sm"
                  />
                </label>
                <label className="flex-1 text-xs text-ink-3">
                  Days after
                  <input
                    name="activationTrail"
                    type="number"
                    min={0}
                    max={365}
                    defaultValue={card?.activation?.trailDays ?? 0}
                    className="form-input mt-1 w-full text-sm"
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-rule bg-white p-5 space-y-4">
          <AdminField name="group" label="Group" errors={errors.group}>
            <input
              name="group"
              type="text"
              defaultValue={card?.group ?? ""}
              maxLength={120}
              className="form-input text-sm"
            />
          </AdminField>
          <AdminField
            name="contact"
            label="Contact"
            hint="Leave as office unless a specific person handles this."
            errors={errors.contact}
          >
            <input
              name="contact"
              type="text"
              defaultValue={card?.contact ?? ""}
              maxLength={60}
              className="form-input font-mono text-sm"
            />
          </AdminField>
          <AdminField name="position" label="Order" errors={errors.position}>
            <input
              name="position"
              type="number"
              min={0}
              max={9999}
              defaultValue={card?.position ?? 0}
              className="form-input text-sm"
            />
          </AdminField>
          <AdminField
            name="note"
            label="Internal note"
            hint="Never shown publicly."
            errors={errors.note}
          >
            <textarea
              name="note"
              defaultValue={card?.note ?? ""}
              rows={3}
              maxLength={2000}
              className="form-input text-sm"
            />
          </AdminField>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-pill bg-rust px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rust-dark disabled:opacity-70"
        >
          {pending ? "Saving…" : mode === "create" ? "Create card" : "Save changes"}
        </button>
        {dirty && !pending && (
          <p className="text-center text-xs text-ink-3">
            You have unsaved changes.
          </p>
        )}
      </aside>
    </form>
  );

  function updateMoment(i: number, patch: Partial<Moment>) {
    const next = [...moments];
    next[i] = { ...next[i]!, ...patch };
    setMoments(next);
    setDirty(true);
  }
}
