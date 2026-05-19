"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  BaptismSubmitSchema,
  type BaptismSubmission,
} from "@/lib/validators/baptism";
import {
  AddressBlock,
  FormSection,
  RadioField,
  TextField,
} from "./atoms";

const YES_NO = ["Yes", "No"] as const;
const GENDERS = ["Male", "Female"] as const;

export function BaptismForm() {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<BaptismSubmission>({
    resolver: zodResolver(BaptismSubmitSchema),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = form;

  const onSubmit = async (values: BaptismSubmission) => {
    setServerError(null);
    try {
      const res = await fetch("/api/baptism", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setServerError(body.error ?? "Couldn't send the form — try again.");
        return;
      }
      setSubmitted(true);
      reset();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setServerError("Network error — try again.");
    }
  };

  const onInvalid = () => {
    setServerError(
      "Please scroll up and complete the required fields marked in red.",
    );
  };

  if (submitted) {
    return (
      <div className="rounded-lg border border-rule bg-white p-10 text-center shadow-sm">
        <p className="font-serif text-3xl font-bold text-navy">
          Welcome to the journey.
        </p>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-ink-2">
          Your baptism intake form has been received. A member of our parish
          staff will be in touch to schedule the next baptism preparation
          session and confirm the date.
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-6 text-sm font-semibold text-rust-dark hover:text-rust"
        >
          Submit another
        </button>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit, onInvalid)}
      aria-label="Baptism intake form"
      className="space-y-6"
    >
      {serverError && (
        <div className="rounded-md border-l-4 border-rust bg-rust-pale px-4 py-3 text-sm text-rust-dark">
          {serverError}
        </div>
      )}

      <FormSection id="contact" eyebrow="Section 1" title="General contact">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField<BaptismSubmission>
            name="phone"
            label="Phone / Mobile"
            type="tel"
            required
            autoComplete="tel"
            register={register}
            errors={errors}
          />
          <TextField<BaptismSubmission>
            name="email"
            label="Email"
            type="email"
            required
            autoComplete="email"
            register={register}
            errors={errors}
          />
        </div>
      </FormSection>

      <FormSection id="child" eyebrow="Section 2" title="Child">
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField<BaptismSubmission>
            name="childFirstName"
            label="First name"
            required
            register={register}
            errors={errors}
          />
          <TextField<BaptismSubmission>
            name="childMiddleName"
            label="Middle name"
            register={register}
            errors={errors}
          />
          <TextField<BaptismSubmission>
            name="childLastName"
            label="Last name"
            required
            register={register}
            errors={errors}
          />
        </div>
        <RadioField<BaptismSubmission>
          name="childGender"
          label="Gender"
          options={GENDERS}
          required
          register={register}
          errors={errors}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField<BaptismSubmission>
            name="childDateOfBirth"
            label="Date of birth (or expected)"
            type="date"
            required
            register={register}
            errors={errors}
          />
          <TextField<BaptismSubmission>
            name="childPlaceOfBirth"
            label="Place of birth"
            required
            register={register}
            errors={errors}
          />
        </div>
        <AddressBlock<BaptismSubmission>
          baseName="childBirthAddress"
          label="Place of birth — address"
          register={register}
          errors={errors}
        />
      </FormSection>

      <FormSection id="mother" eyebrow="Section 3" title="Mother">
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField<BaptismSubmission>
            name="motherFirstName"
            label="First name"
            required
            register={register}
            errors={errors}
          />
          <TextField<BaptismSubmission>
            name="motherMiddleName"
            label="Middle name"
            register={register}
            errors={errors}
          />
          <TextField<BaptismSubmission>
            name="motherLastName"
            label="Last name"
            required
            register={register}
            errors={errors}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField<BaptismSubmission>
            name="motherMaidenName"
            label="Maiden name"
            register={register}
            errors={errors}
          />
          <TextField<BaptismSubmission>
            name="motherReligion"
            label="Religion"
            required
            register={register}
            errors={errors}
          />
        </div>
      </FormSection>

      <FormSection id="father" eyebrow="Section 4" title="Father">
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField<BaptismSubmission>
            name="fatherFirstName"
            label="First name"
            required
            register={register}
            errors={errors}
          />
          <TextField<BaptismSubmission>
            name="fatherMiddleName"
            label="Middle name"
            register={register}
            errors={errors}
          />
          <TextField<BaptismSubmission>
            name="fatherLastName"
            label="Last name"
            required
            register={register}
            errors={errors}
          />
        </div>
        <TextField<BaptismSubmission>
          name="fatherReligion"
          label="Religion"
          required
          register={register}
          errors={errors}
        />
      </FormSection>

      <FormSection id="family" eyebrow="Section 5" title="Family">
        <AddressBlock<BaptismSubmission>
          baseName="familyAddress"
          label="Family address"
          register={register}
          errors={errors}
        />
        <TextField<BaptismSubmission>
          name="familyPhone"
          label="Family phone number"
          type="tel"
          required
          register={register}
          errors={errors}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField<BaptismSubmission>
            name="parentMarriageDate"
            label="Parent marriage date"
            type="date"
            required
            register={register}
            errors={errors}
          />
          <TextField<BaptismSubmission>
            name="marriageLocation"
            label="Marriage location (church name)"
            required
            register={register}
            errors={errors}
          />
        </div>
        <AddressBlock<BaptismSubmission>
          baseName="marriageAddress"
          label="Marriage address"
          register={register}
          errors={errors}
        />
        <RadioField<BaptismSubmission>
          name="registeredParishioner"
          label="Are you a registered parishioner?"
          options={YES_NO}
          required
          register={register}
          errors={errors}
        />
        <RadioField<BaptismSubmission>
          name="baptizingFirstChild"
          label="Are you baptizing your first child?"
          options={YES_NO}
          required
          register={register}
          errors={errors}
        />
        <TextField<BaptismSubmission>
          name="siblingAges"
          label="Ages of siblings"
          register={register}
          errors={errors}
        />
      </FormSection>

      <FormSection id="godmother" eyebrow="Section 6" title="Godmother">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField<BaptismSubmission>
            name="godMotherFirstName"
            label="First name"
            required
            register={register}
            errors={errors}
          />
          <TextField<BaptismSubmission>
            name="godMotherLastName"
            label="Last name"
            required
            register={register}
            errors={errors}
          />
        </div>
        <TextField<BaptismSubmission>
          name="godMotherReligion"
          label="Religion"
          required
          register={register}
          errors={errors}
        />
        <AddressBlock<BaptismSubmission>
          baseName="godMotherAddress"
          label="Address"
          register={register}
          errors={errors}
        />
      </FormSection>

      <FormSection id="godfather" eyebrow="Section 7" title="Godfather">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField<BaptismSubmission>
            name="godFatherFirstName"
            label="First name"
            required
            register={register}
            errors={errors}
          />
          <TextField<BaptismSubmission>
            name="godFatherLastName"
            label="Last name"
            required
            register={register}
            errors={errors}
          />
        </div>
        <TextField<BaptismSubmission>
          name="godFatherReligion"
          label="Religion"
          required
          register={register}
          errors={errors}
        />
        <AddressBlock<BaptismSubmission>
          baseName="godFatherAddress"
          label="Address"
          register={register}
          errors={errors}
        />
      </FormSection>

      <div className="flex flex-col gap-3 rounded-lg border border-rule bg-cream p-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-2">
          By submitting, you&rsquo;ll receive an email confirmation and our
          parish staff will reach out to schedule baptism prep.
        </p>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center gap-2 rounded-pill bg-rust px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rust-dark disabled:opacity-70"
        >
          {isSubmitting ? "Submitting…" : "Submit baptism intake"}
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </form>
  );
}
