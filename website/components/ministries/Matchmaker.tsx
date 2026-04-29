"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { type MatchmakerManifest } from "@/db/schema";

type MatchResult = {
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  meetingCadence: string | null;
  contactEmail: string | null;
  score: number;
};

/**
 * Client island that drives the Ministry Matchmaker modal.
 *
 * Pass the live manifest from a Server Component (e.g. /ministries
 * or homepage) so we don't need a separate fetch on open. The modal
 * walks through questions, then POSTs to /api/matchmaker for the
 * authoritative top-5 result list.
 */
export function Matchmaker({
  manifest,
  triggerLabel = "Ministry matchmaker",
  triggerVariant = "rust",
}: {
  manifest: MatchmakerManifest;
  triggerLabel?: string;
  triggerVariant?: "rust" | "navy" | "outline-light";
}) {
  const [open, setOpen] = useState(false);

  const triggerCls =
    triggerVariant === "rust"
      ? "bg-rust text-white hover:bg-rust-dark"
      : triggerVariant === "navy"
        ? "bg-navy text-white hover:bg-navy-light"
        : "border border-white/30 text-white hover:bg-white/10";

  const noQuestions = !manifest?.questions?.length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={noQuestions}
        title={noQuestions ? "Matchmaker not configured yet" : undefined}
        className={`inline-flex items-center gap-2 rounded-pill px-6 py-3 text-sm font-semibold shadow-sm transition-colors disabled:opacity-50 ${triggerCls}`}
      >
        {triggerLabel} <span aria-hidden="true">→</span>
      </button>

      {open && (
        <MatchmakerModal manifest={manifest} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function MatchmakerModal({
  manifest,
  onClose,
}: {
  manifest: MatchmakerManifest;
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<MatchResult[] | null>(null);
  const [matched, setMatched] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();

  const questions = manifest.questions;
  // Skip set: question ids that have been excluded by an earlier answer's
  // skipQuestionIds. Recomputed from `answers` so back-button works.
  const skipped = new Set<string>();
  for (const q of questions) {
    const aId = answers[q.id];
    if (!aId) continue;
    const ans = q.answers.find((a) => a.id === aId);
    ans?.skipQuestionIds?.forEach((id) => skipped.add(id));
  }
  // Walk backward through `step`, returning the previous visible question
  // index. -1 when this is the first visible step.
  const findPrevStep = (from: number): number => {
    for (let i = from - 1; i >= 0; i--) {
      if (!skipped.has(questions[i]!.id)) return i;
    }
    return -1;
  };
  const showingResults = results !== null;

  // Esc closes; lock body scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const pick = (questionId: string, answerId: string) => {
    // Compute the new skip set including this fresh pick so we
    // determine the next step against the latest state.
    const nextAnswers = { ...answers, [questionId]: answerId };
    const nextSkipped = new Set<string>();
    for (const q of questions) {
      const aId = nextAnswers[q.id];
      if (!aId) continue;
      const ans = q.answers.find((a) => a.id === aId);
      ans?.skipQuestionIds?.forEach((id) => nextSkipped.add(id));
    }
    let next = -1;
    for (let i = step + 1; i < questions.length; i++) {
      if (!nextSkipped.has(questions[i]!.id)) {
        next = i;
        break;
      }
    }
    setAnswers(nextAnswers);
    if (next !== -1) {
      setStep(next);
    } else {
      void submit(nextAnswers);
    }
  };

  const submit = async (finalAnswers: Record<string, string>) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/matchmaker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: finalAnswers }),
      });
      if (!res.ok) {
        setError("Couldn't load matches. Try again in a moment.");
        return;
      }
      const data = (await res.json()) as { matches: MatchResult[]; matched: boolean };
      setResults(data.matches);
      setMatched(data.matched);
    } catch {
      setError("Network error — try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setStep(0);
    setAnswers({});
    setResults(null);
    setError(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-navy-dark/70 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-6 shadow-lg sm:p-8"
      >
        <header className="flex items-baseline justify-between gap-4">
          <h2 id={titleId} className="font-serif text-2xl font-bold text-navy">
            Ministry matchmaker
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-ink-3 hover:bg-cream"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        {error && (
          <div className="mt-4 rounded-md border-l-4 border-rust bg-rust-pale px-4 py-3 text-sm text-rust-dark">
            {error}
          </div>
        )}

        {showingResults ? (
          <Results results={results!} matched={matched} onReset={reset} />
        ) : submitting ? (
          <p className="py-12 text-center text-sm text-ink-3">Finding your matches…</p>
        ) : (
          <Wizard
            question={questions[step]!}
            // Step number / total reflect VISIBLE questions only — skipped
            // questions don't count toward the progress meter.
            stepNum={
              questions.slice(0, step + 1).filter((q) => !skipped.has(q.id))
                .length
            }
            totalSteps={
              questions.length - skipped.size || questions.length
            }
            chosenId={answers[questions[step]!.id]}
            onPick={(answerId) => pick(questions[step]!.id, answerId)}
            onBack={
              findPrevStep(step) !== -1
                ? () => setStep(findPrevStep(step))
                : undefined
            }
          />
        )}
      </div>
    </div>
  );
}

function Wizard({
  question,
  stepNum,
  totalSteps,
  chosenId,
  onPick,
  onBack,
}: {
  question: MatchmakerManifest["questions"][number];
  stepNum: number;
  totalSteps: number;
  chosenId?: string;
  onPick: (answerId: string) => void;
  onBack?: () => void;
}) {
  const pct = ((stepNum - 1) / totalSteps) * 100;
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between text-xs text-ink-3">
        <span>
          Question {stepNum} of {totalSteps}
        </span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-cream">
        <div
          className="h-full bg-rust transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="mt-6 font-serif text-xl font-bold text-navy">
        {question.prompt}
      </p>

      <ul className="mt-5 space-y-2">
        {question.answers.map((a) => (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => onPick(a.id)}
              className={`block w-full rounded-md border px-5 py-4 text-left transition-colors ${
                chosenId === a.id
                  ? "border-navy bg-navy/5"
                  : "border-rule bg-white hover:border-navy"
              }`}
            >
              <div className="font-serif text-base font-bold text-navy">
                {a.label}
              </div>
              {a.sublabel && (
                <div className="mt-0.5 text-xs text-ink-3">{a.sublabel}</div>
              )}
            </button>
          </li>
        ))}
      </ul>

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mt-5 text-sm font-semibold text-rust-dark hover:text-rust"
        >
          ← Back
        </button>
      )}
    </div>
  );
}

function Results({
  results,
  matched,
  onReset,
}: {
  results: MatchResult[];
  matched: boolean;
  onReset: () => void;
}) {
  if (results.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="font-serif text-lg font-bold text-navy">
          No published ministries yet.
        </p>
        <p className="mt-2 text-sm text-ink-3">
          Add some via <code className="rounded bg-cream px-1.5 py-0.5 text-xs">/admin/ministries</code> and try again.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <p className="text-xs uppercase tracking-[0.12em] text-ink-3">
        {matched ? "Your top matches" : "A few starting points"}
      </p>
      <h3 className="mt-1 font-serif text-2xl font-bold text-navy">
        {matched ? "We think you'd love these." : "Here's where most folks start."}
      </h3>
      <p className="mt-2 text-sm text-ink-2">
        {matched
          ? "Reach out to any of these and we'll connect you with a leader."
          : "Nothing scored a strong match — these are good first stops while you explore."}
      </p>

      <ul className="mt-6 space-y-3">
        {results.map((r) => (
          <li key={r.slug}>
            <Link
              href={`/ministries/${r.slug}`}
              className="block rounded-md border border-rule bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h4 className="font-serif text-lg font-bold text-navy">
                  {r.name}
                </h4>
                {r.score > 0 && (
                  <span className="rounded-pill bg-rust-pale px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-rust-dark">
                    {r.score} match
                    {r.score === 1 ? "" : "es"}
                  </span>
                )}
              </div>
              {r.tagline && (
                <p className="mt-1 text-sm text-ink-2">{r.tagline}</p>
              )}
              {r.meetingCadence && (
                <p className="mt-2 text-xs text-ink-3">{r.meetingCadence}</p>
              )}
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onReset}
          className="rounded-pill border border-rule bg-white px-5 py-2.5 text-sm font-semibold text-navy hover:border-navy"
        >
          Start over
        </button>
        <Link
          href="/ministries"
          className="text-sm font-semibold text-rust-dark hover:text-rust"
        >
          Browse all ministries →
        </Link>
      </div>
    </div>
  );
}
