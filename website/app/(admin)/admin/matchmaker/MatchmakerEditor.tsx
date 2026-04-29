"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  type MatchmakerAnswer,
  type MatchmakerManifest,
  type MatchmakerQuestion,
} from "@/db/schema";
import { saveMatchmakerAction } from "./_actions";

const newQuestion = (): MatchmakerQuestion => ({
  id: "",
  prompt: "",
  answers: [
    { id: "", label: "", tags: [] },
    { id: "", label: "", tags: [] },
  ],
});

const newAnswer = (): MatchmakerAnswer => ({
  id: "",
  label: "",
  tags: [],
});

export function MatchmakerEditor({
  initial,
  knownMinistryTags,
}: {
  initial: MatchmakerManifest;
  knownMinistryTags: string[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [topError, setTopError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [questions, setQuestions] = useState<MatchmakerQuestion[]>(
    initial.questions.length > 0 ? initial.questions : [newQuestion()],
  );
  const [fallbackTags, setFallbackTags] = useState<string>(
    (initial.fallbackTags ?? []).join(", "),
  );

  const setQ = (i: number, patch: Partial<MatchmakerQuestion>) =>
    setQuestions((prev) => prev.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));

  const setA = (qi: number, ai: number, patch: Partial<MatchmakerAnswer>) =>
    setQuestions((prev) =>
      prev.map((q, idx) =>
        idx === qi
          ? {
              ...q,
              answers: q.answers.map((a, j) => (j === ai ? { ...a, ...patch } : a)),
            }
          : q,
      ),
    );

  const onSubmit = () => {
    setTopError(null);
    setSaved(false);
    const manifest: MatchmakerManifest = {
      questions: questions.map((q) => ({
        id: q.id.trim(),
        prompt: q.prompt.trim(),
        answers: q.answers.map((a) => ({
          id: a.id.trim(),
          label: a.label.trim(),
          sublabel: a.sublabel?.trim() || undefined,
          tags: a.tags,
          skipQuestionIds:
            a.skipQuestionIds && a.skipQuestionIds.length > 0
              ? a.skipQuestionIds
              : undefined,
        })),
      })),
      fallbackTags: fallbackTags
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };

    start(async () => {
      const r = await saveMatchmakerAction(manifest);
      if (r.ok) {
        setSaved(true);
        router.refresh();
      } else if ("fieldErrors" in r) {
        setTopError(
          "Validation failed. Check question / answer ids (lowercase, hyphens) and that you have at least 2 answers per question.",
        );
      } else {
        setTopError(r.error);
      }
    });
  };

  return (
    <div className="space-y-8">
      {topError && (
        <div className="rounded-md border-l-4 border-rust bg-rust-pale px-4 py-3 text-sm text-rust-dark">
          {topError}
        </div>
      )}
      {saved && (
        <div className="rounded-md border-l-4 border-emerald-500 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Saved. The public Matchmaker uses these questions on the next request.
        </div>
      )}

      {questions.map((q, qi) => (
        <fieldset
          key={qi}
          className="rounded-lg border border-rule bg-white p-6"
        >
          <legend className="px-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-3">
            Question {qi + 1}
          </legend>

          <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-3">
                ID
              </span>
              <input
                type="text"
                value={q.id}
                onChange={(e) => setQ(qi, { id: e.target.value })}
                placeholder="season"
                className="form-input mt-1 font-mono text-sm"
                pattern="^[a-z0-9][a-z0-9-]*$"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-3">
                Prompt
              </span>
              <input
                type="text"
                value={q.prompt}
                onChange={(e) => setQ(qi, { prompt: e.target.value })}
                placeholder="What season of life are you in?"
                className="form-input mt-1"
                maxLength={200}
              />
            </label>
          </div>

          <h3 className="mt-6 text-xs font-semibold uppercase tracking-[0.12em] text-ink-3">
            Answers
          </h3>
          <ul className="mt-3 space-y-3">
            {q.answers.map((a, ai) => (
              <li key={ai} className="space-y-2 rounded-md bg-cream p-4">
                <div className="grid gap-3 sm:grid-cols-[140px_1fr_1fr]">
                  <input
                    type="text"
                    value={a.id}
                    onChange={(e) => setA(qi, ai, { id: e.target.value })}
                    placeholder="ID (e.g. young)"
                    className="form-input font-mono text-sm"
                    pattern="^[a-z0-9][a-z0-9-]*$"
                  />
                  <input
                    type="text"
                    value={a.label}
                    onChange={(e) => setA(qi, ai, { label: e.target.value })}
                    placeholder="Label"
                    className="form-input"
                  />
                  <input
                    type="text"
                    value={a.sublabel ?? ""}
                    onChange={(e) => setA(qi, ai, { sublabel: e.target.value })}
                    placeholder="Sublabel (optional)"
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-ink-3">
                    Tags
                  </label>
                  <input
                    type="text"
                    value={a.tags.join(", ")}
                    onChange={(e) =>
                      setA(qi, ai, {
                        tags: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="formation, community, music"
                    className="form-input"
                  />
                  {knownMinistryTags.length > 0 && (
                    <p className="mt-1 text-[11px] text-ink-3">
                      Tags currently in ministries:{" "}
                      <span className="font-mono">
                        {knownMinistryTags.join(", ")}
                      </span>
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-ink-3">
                    Skip questions when this is chosen
                  </label>
                  {(() => {
                    const downstream = questions
                      .slice(qi + 1)
                      .filter((dq) => dq.id.trim());
                    if (downstream.length === 0) {
                      return (
                        <p className="mt-1 text-[11px] text-ink-3">
                          No downstream questions yet — add another question
                          (with an id) to enable skip rules.
                        </p>
                      );
                    }
                    const selected = a.skipQuestionIds ?? [];
                    return (
                      <ul className="mt-1 flex flex-wrap gap-2">
                        {downstream.map((dq) => {
                          const checked = selected.includes(dq.id);
                          return (
                            <li key={dq.id}>
                              <label
                                className={
                                  "inline-flex cursor-pointer items-center gap-1.5 rounded-pill border px-3 py-1 text-xs " +
                                  (checked
                                    ? "border-rust bg-rust-pale text-rust-dark"
                                    : "border-rule bg-white text-ink-2 hover:border-navy")
                                }
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    const next = e.target.checked
                                      ? [...selected, dq.id]
                                      : selected.filter((x) => x !== dq.id);
                                    setA(qi, ai, { skipQuestionIds: next });
                                  }}
                                  className="size-3"
                                />
                                <span className="font-mono">{dq.id}</span>
                                {dq.prompt && (
                                  <span className="text-ink-3">
                                    — {dq.prompt.slice(0, 30)}
                                    {dq.prompt.length > 30 ? "…" : ""}
                                  </span>
                                )}
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    );
                  })()}
                </div>
                {q.answers.length > 2 && (
                  <button
                    type="button"
                    onClick={() =>
                      setQuestions((prev) =>
                        prev.map((x, i) =>
                          i === qi
                            ? { ...x, answers: x.answers.filter((_, j) => j !== ai) }
                            : x,
                        ),
                      )
                    }
                    className="text-xs font-semibold text-ink-3 hover:text-rust-dark"
                  >
                    Remove answer
                  </button>
                )}
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() =>
                setQuestions((prev) =>
                  prev.map((x, i) =>
                    i === qi ? { ...x, answers: [...x.answers, newAnswer()] } : x,
                  ),
                )
              }
              className="rounded-pill border border-rule bg-white px-4 py-2 text-xs font-semibold text-navy hover:border-navy"
            >
              + Add answer
            </button>
            {questions.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setQuestions((prev) => prev.filter((_, i) => i !== qi))
                }
                className="text-xs font-semibold text-rust-dark hover:text-rust"
              >
                Delete question
              </button>
            )}
          </div>
        </fieldset>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setQuestions((prev) => [...prev, newQuestion()])}
          className="rounded-pill border border-rule bg-white px-4 py-2 text-sm font-semibold text-navy hover:border-navy"
        >
          + Add question
        </button>
      </div>

      <fieldset className="rounded-lg border border-rule bg-white p-6">
        <legend className="px-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-3">
          Fallback tags
        </legend>
        <p className="text-sm text-ink-2">
          Applied to every quiz submission regardless of answers — a base
          floor that nudges scoring. Comma-separated.
        </p>
        <input
          type="text"
          value={fallbackTags}
          onChange={(e) => setFallbackTags(e.target.value)}
          placeholder="newcomer, community"
          className="form-input mt-3"
        />
      </fieldset>

      <button
        type="button"
        onClick={onSubmit}
        disabled={pending}
        className="rounded-pill bg-rust px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rust-dark disabled:opacity-70"
      >
        {pending ? "Saving…" : "Save matchmaker"}
      </button>
    </div>
  );
}
