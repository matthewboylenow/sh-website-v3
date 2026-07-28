"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TextField, TextareaField } from "@/components/forms/atoms";

const Schema = z.object({
  email: z.email("Enter a valid email"),
  personName: z.string().min(1, "Required").max(200),
  reason: z.string().min(1, "Required").max(4000),
  phone: z.string().max(40).optional().or(z.literal("")),
  comments: z.string().max(4000).optional().or(z.literal("")),
});

type Values = z.infer<typeof Schema>;

export function PrayerRequestForm() {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<Values>({ resolver: zodResolver(Schema) });

  async function onSubmit(values: Values) {
    setServerError(null);
    const res = await fetch("/api/prayer-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setServerError(body?.error ?? "Something went wrong — please try again.");
      return;
    }
    setSubmitted(true);
    reset();
  }

  if (submitted) {
    return (
      <div className="rounded-lg border border-rule bg-white p-8 text-center">
        <span className="sh-eyebrow">Thank you</span>
        <h2 className="mt-2 font-serif text-2xl font-bold text-navy">
          Your request is in our prayers
        </h2>
        <p className="mx-auto mt-3 max-w-[46ch] text-sm text-ink-2">
          Our prayer team has received your request and will hold it in
          prayer this week.
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-6 inline-flex items-center rounded-pill border border-rule px-5 py-2.5 text-sm font-semibold text-navy transition-colors hover:border-navy"
        >
          Submit another request
        </button>
      </div>
    );
  }

  return (
    <form
      noValidate
      aria-label="Prayer request form"
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField<Values>
          name="email"
          label="Your email"
          type="email"
          required
          autoComplete="email"
          register={register}
          errors={errors}
        />
        <TextField<Values>
          name="phone"
          label="Your phone number"
          type="tel"
          autoComplete="tel"
          register={register}
          errors={errors}
        />
      </div>
      <TextField<Values>
        name="personName"
        label="Name of person being prayed for"
        required
        register={register}
        errors={errors}
      />
      <TextareaField<Values>
        name="reason"
        label="Reason for your prayer request"
        required
        rows={4}
        register={register}
        errors={errors}
      />
      <TextareaField<Values>
        name="comments"
        label="Comments"
        rows={3}
        register={register}
        errors={errors}
      />

      {serverError && (
        <p role="alert" className="rounded-md bg-rust/10 px-4 py-3 text-sm font-semibold text-rust-dark">
          {serverError}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex items-center rounded-pill bg-rust px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-rust-dark disabled:opacity-60"
      >
        {isSubmitting ? "Sending…" : "Send prayer request"}
      </button>
    </form>
  );
}
