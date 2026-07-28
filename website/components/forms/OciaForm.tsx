"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  OciaSubmitSchema,
  OCIA_BAPTIZED_OPTIONS,
  OCIA_MARITAL_STATUSES,
  OCIA_RESONATE_OPTIONS,
  OCIA_SACRAMENTS,
  type OciaSubmission,
} from "@/lib/validators/ocia";
import {
  FormSection,
  RadioField,
  SelectField,
  TextField,
  TextareaField,
} from "@/components/forms/atoms";

export function OciaForm() {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<OciaSubmission>({
    resolver: zodResolver(OciaSubmitSchema),
    defaultValues: { sacramentsReceived: [] },
  });

  async function onSubmit(values: OciaSubmission) {
    setServerError(null);
    const res = await fetch("/api/ocia", {
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onInvalid() {
    setServerError("Please scroll up and complete the required fields.");
  }

  if (submitted) {
    return (
      <div className="rounded-lg border border-rule bg-white p-8 text-center">
        <span className="sh-eyebrow">Thank you</span>
        <h2 className="mt-2 font-serif text-2xl font-bold text-navy">
          We received your inquiry
        </h2>
        <p className="mx-auto mt-3 max-w-[48ch] text-sm text-ink-2">
          Someone from our OCIA team will reach out soon. In the meantime,
          you&rsquo;re always welcome at Mass — come as you are.
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-6 inline-flex items-center rounded-pill border border-rule px-5 py-2.5 text-sm font-semibold text-navy transition-colors hover:border-navy"
        >
          Submit another inquiry
        </button>
      </div>
    );
  }

  return (
    <form
      noValidate
      aria-label="OCIA inquirer form"
      onSubmit={handleSubmit(onSubmit, onInvalid)}
      className="space-y-6"
    >
      <FormSection
        id="contact"
        eyebrow="Section 1"
        title="Contact"
        description="So our OCIA team can reach you. We'll never share your information."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField<OciaSubmission>
            name="firstName"
            label="First name"
            required
            autoComplete="given-name"
            register={register}
            errors={errors}
          />
          <TextField<OciaSubmission>
            name="lastName"
            label="Last name"
            required
            autoComplete="family-name"
            register={register}
            errors={errors}
          />
          <TextField<OciaSubmission>
            name="email"
            label="Email"
            type="email"
            required
            autoComplete="email"
            register={register}
            errors={errors}
          />
          <TextField<OciaSubmission>
            name="phone"
            label="Phone / mobile"
            type="tel"
            autoComplete="tel"
            register={register}
            errors={errors}
          />
        </div>
      </FormSection>

      <FormSection
        id="background"
        eyebrow="Section 2"
        title="Religious background"
        description="Answer what you can — 'I don't know' is a perfectly good answer."
      >
        <div className="space-y-4">
          <TextField<OciaSubmission>
            name="currentAffiliation"
            label="What, if any, is your current religious affiliation?"
            register={register}
            errors={errors}
          />
          <RadioField<OciaSubmission>
            name="baptized"
            label="Have you ever been baptized?"
            options={OCIA_BAPTIZED_OPTIONS}
            register={register}
            errors={errors}
          />
          <TextareaField<OciaSubmission>
            name="baptismDetails"
            label="Baptism details (if applicable and known)"
            hint="Roughly when, where, and in what tradition."
            rows={3}
            register={register}
            errors={errors}
          />
          <fieldset>
            <legend className="text-sm font-semibold text-navy">
              If you were baptized Catholic, please check which sacraments you
              have received:
            </legend>
            <div className="mt-2 space-y-2">
              {OCIA_SACRAMENTS.map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm text-ink-2">
                  <input
                    type="checkbox"
                    value={s}
                    {...register("sacramentsReceived")}
                    className="h-4 w-4 rounded border-rule text-rust focus:ring-rust"
                  />
                  {s}
                </label>
              ))}
            </div>
          </fieldset>
          <SelectField<OciaSubmission>
            name="maritalStatus"
            label="Current marital status"
            options={OCIA_MARITAL_STATUSES}
            register={register}
            errors={errors}
          />
        </div>
      </FormSection>

      <FormSection
        id="journey"
        eyebrow="Section 3"
        title="Your journey"
        description="These help us meet you where you are. Short answers are fine."
      >
        <div className="space-y-4">
          <TextareaField<OciaSubmission>
            name="whatLedYou"
            label="What or who has led you to want to know more about Catholicism?"
            register={register}
            errors={errors}
          />
          <TextareaField<OciaSubmission>
            name="religiousEducation"
            label="What type of religious education have you had as a child and adult?"
            register={register}
            errors={errors}
          />
          <TextareaField<OciaSubmission>
            name="catholicInteractions"
            label="What types of interactions have you had with the Catholic faith?"
            register={register}
            errors={errors}
          />
          <TextareaField<OciaSubmission>
            name="questionsConcerns"
            label="What are some questions or concerns you have with the Catholic faith?"
            register={register}
            errors={errors}
          />
          <TextareaField<OciaSubmission>
            name="whoIsJesus"
            label="Who is Jesus Christ to you? (No wrong answers!)"
            register={register}
            errors={errors}
          />
          <RadioField<OciaSubmission>
            name="resonates"
            label="Which statement resonates with you the most at this time?"
            options={OCIA_RESONATE_OPTIONS}
            register={register}
            errors={errors}
          />
        </div>
      </FormSection>

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
        {isSubmitting ? "Sending…" : "Send my inquiry"}
      </button>
    </form>
  );
}
