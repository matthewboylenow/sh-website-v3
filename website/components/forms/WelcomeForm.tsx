"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export const WelcomeFormSchema = z.object({
  firstName: z.string().min(1, "Please share your first name").max(100),
  lastName: z.string().min(1, "Please share your last name").max(100),
  email: z.email("Please enter a valid email"),
  reason: z.enum([
    "exploring",
    "new_to_area",
    "looking_for_parish",
    "returning",
    "kids_for_formation",
    "other",
  ]),
});

export type WelcomeFormValues = z.infer<typeof WelcomeFormSchema>;

const REASONS: { value: WelcomeFormValues["reason"]; label: string }[] = [
  { value: "exploring", label: "Just exploring — I want to visit soon" },
  { value: "new_to_area", label: "I'm new to the area" },
  { value: "looking_for_parish", label: "Looking for a parish home" },
  { value: "returning", label: "Coming back to the Church" },
  { value: "kids_for_formation", label: "I have kids for Faith Formation" },
  { value: "other", label: "Other" },
];

/**
 * Welcome form — React Hook Form + Zod.
 * Per the kickoff: onSubmit logs to console for now. Wiring to
 * POST /api/welcome lands in Step 6.
 */
export function WelcomeForm() {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<WelcomeFormValues>({
    resolver: zodResolver(WelcomeFormSchema),
    defaultValues: { reason: "exploring" },
  });

  const [serverError, setServerError] = useState<string | null>(null);

  const onSubmit = async (values: WelcomeFormValues) => {
    setServerError(null);
    try {
      const res = await fetch("/api/welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setServerError(body.error ?? "Couldn't send your welcome — try again.");
        return;
      }
      setSubmitted(true);
      reset();
    } catch {
      setServerError("Network error — try again.");
    }
  };

  if (submitted) {
    return (
      <div className="rounded-md bg-cream p-6 text-center">
        <p className="font-serif text-lg font-bold text-navy">
          Welcome sent — we&rsquo;ll be in touch.
        </p>
        <p className="mt-2 text-sm text-ink-2">
          A greeter will be watching for you on your first Sunday.
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-4 text-sm font-semibold text-rust-dark hover:text-rust"
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="space-y-4 text-left"
      onSubmit={handleSubmit(onSubmit)}
      aria-label="Welcome form"
    >
      {serverError && (
        <div className="rounded-md border-l-4 border-rust bg-rust-pale px-3 py-2 text-xs text-rust-dark">
          {serverError}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="First name"
          error={errors.firstName?.message}
          render={(props) => (
            <input type="text" {...props} {...register("firstName")} />
          )}
        />
        <Field
          label="Last name"
          error={errors.lastName?.message}
          render={(props) => (
            <input type="text" {...props} {...register("lastName")} />
          )}
        />
      </div>
      <Field
        label="Email"
        error={errors.email?.message}
        render={(props) => (
          <input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...props}
            {...register("email")}
          />
        )}
      />
      <Field
        label="What brings you to Saint Helen?"
        error={errors.reason?.message}
        render={(props) => (
          <select {...props} {...register("reason")}>
            {REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        )}
      />

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-pill bg-rust px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rust-dark disabled:opacity-70"
      >
        {isSubmitting ? "Sending…" : "Send my welcome"}
        <span aria-hidden="true">→</span>
      </button>
      <p className="text-xs text-ink-3">
        We&rsquo;ll send a personal note within a day or two.
      </p>
    </form>
  );
}

/* ---- Field ---- */

function Field({
  label,
  error,
  render,
}: {
  label: string;
  error?: string;
  render: (props: {
    className: string;
    "aria-invalid": boolean;
    "aria-describedby": string | undefined;
  }) => React.ReactNode;
}) {
  const fieldId = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const errorId = error ? `${fieldId}-err` : undefined;
  const props = {
    className: `w-full rounded-md border bg-white px-4 py-2 text-sm text-ink transition-colors placeholder:text-ink-4 focus:outline-none focus:ring-2 focus:ring-rust/60 ${
      error ? "border-rust" : "border-rule"
    }`,
    "aria-invalid": Boolean(error),
    "aria-describedby": errorId,
  };
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-3">
        {label}
      </span>
      <div className="mt-1">{render(props)}</div>
      {error && (
        <p id={errorId} className="mt-1 text-xs text-rust-dark">
          {error}
        </p>
      )}
    </label>
  );
}
