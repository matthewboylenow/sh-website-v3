"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  COMMENDATION_HYMNS,
  COMMUNION_HYMNS,
  ENTRANCE_HYMNS,
  FIRST_READING_OPTIONS,
  INTERCESSION_OPTIONS,
  MARITAL_STATUSES,
  MASS_TIMES,
  PREPARATION_HYMNS,
  PSALM_OPTIONS,
  RECESSIONAL_HYMNS,
  REMAINS_KINDS,
  SECOND_READING_OPTIONS,
  SPOUSE_STATUSES,
  YES_NO,
  YES_NO_NA,
} from "@/lib/funeral-options";
import {
  FuneralSubmitSchema,
  type FuneralSubmission,
} from "@/lib/validators/funeral";
import {
  AddressBlock,
  FormSection,
  RadioField,
  SelectField,
  TextField,
  TextareaField,
} from "./atoms";

const SECTIONS = [
  { id: "filer", label: "Form submission contact" },
  { id: "mass", label: "Mass scheduling" },
  { id: "history", label: "Personal history" },
  { id: "kin", label: "Next of kin" },
  { id: "background", label: "Background" },
  { id: "faith", label: "Faith life" },
  { id: "burial", label: "Mass of Christian Burial" },
  { id: "readings", label: "Readings and lectors" },
  { id: "livestream", label: "Livestream" },
  { id: "music", label: "Music" },
] as const;

export function FuneralForm() {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<FuneralSubmission>({
    resolver: zodResolver(FuneralSubmitSchema),
    defaultValues: {
      familyChoosesPassages: "",
      familyMemberReader: "",
      wordsOfRemembrance: "",
      livestreamRequested: "",
      familyPlacesPall: "",
      remains: "",
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = form;

  const watchSpouseStatus = watch("maritalStatus");
  const watchRemains = watch("remains");
  const watchFamilyChooses = watch("familyChoosesPassages");
  const watchFamilyReader = watch("familyMemberReader");
  const watchWordsRemembrance = watch("wordsOfRemembrance");

  const onSubmit = async (values: FuneralSubmission) => {
    setServerError(null);
    try {
      const res = await fetch("/api/funerals", {
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
        <p className="font-serif text-3xl font-bold text-navy">Thank you.</p>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-ink-2">
          Your funeral intake form has been received. Father will be in touch
          with you shortly to confirm the arrangements. Please be assured of
          our parish&rsquo;s prayers during this time.
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
    <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
      {/* ---- Section nav ---------------------------------------- */}
      <nav
        aria-label="Form sections"
        className="hidden lg:block"
      >
        <div className="sticky top-28 space-y-1">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-3">
            On this form
          </p>
          {SECTIONS.map((s, i) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="block rounded-md px-3 py-1.5 text-sm text-ink-2 transition-colors hover:bg-cream hover:text-rust-dark"
            >
              <span className="mr-2 text-ink-4">{String(i + 1).padStart(2, "0")}</span>
              {s.label}
            </a>
          ))}
        </div>
      </nav>

      {/* ---- Form ----------------------------------------------- */}
      <form
        noValidate
        onSubmit={handleSubmit(onSubmit, onInvalid)}
        aria-label="Funeral intake form"
        className="space-y-6"
      >
        {serverError && (
          <div className="rounded-md border-l-4 border-rust bg-rust-pale px-4 py-3 text-sm text-rust-dark">
            {serverError}
          </div>
        )}

        <FormSection id="filer" eyebrow="Section 1" title="Form submission contact">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField<FuneralSubmission>
              name="fillerName"
              label="Your name"
              required
              autoComplete="name"
              register={register}
              errors={errors}
            />
            <TextField<FuneralSubmission>
              name="fillerEmail"
              label="Your email"
              type="email"
              required
              autoComplete="email"
              register={register}
              errors={errors}
            />
          </div>
        </FormSection>

        <FormSection id="mass" eyebrow="Section 2" title="Mass scheduling">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField<FuneralSubmission>
              name="massDate"
              label="Date for the Mass"
              type="date"
              required
              register={register}
              errors={errors}
            />
            <SelectField<FuneralSubmission>
              name="massTime"
              label="Time for the Mass"
              options={MASS_TIMES}
              required
              register={register}
              errors={errors}
            />
          </div>
        </FormSection>

        <FormSection
          id="history"
          eyebrow="Section 3"
          title="Personal history"
          description="Tell us about the deceased. Share what feels right — Father will fill in the rest with you in conversation."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField<FuneralSubmission>
              name="deceasedName"
              label="Name of the deceased"
              required
              register={register}
              errors={errors}
            />
            <TextField<FuneralSubmission>
              name="deceasedNickname"
              label="Nickname (if any)"
              register={register}
              errors={errors}
            />
            <TextField<FuneralSubmission>
              name="placeOfBirth"
              label="Place of birth"
              register={register}
              errors={errors}
            />
            <TextField<FuneralSubmission>
              name="deceasedAge"
              label="Age of the deceased"
              register={register}
              errors={errors}
            />
            <TextField<FuneralSubmission>
              name="deceasedDateOfBirth"
              label="Date of birth"
              type="date"
              register={register}
              errors={errors}
            />
          </div>

          <RadioField<FuneralSubmission>
            name="maritalStatus"
            label="Marital status"
            options={MARITAL_STATUSES}
            register={register}
            errors={errors}
          />

          {watchSpouseStatus === "Married" && (
            <>
              <RadioField<FuneralSubmission>
                name="spouseStatus"
                label="Is the spouse living or deceased?"
                options={SPOUSE_STATUSES}
                register={register}
                errors={errors}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField<FuneralSubmission>
                  name="spouseName"
                  label="Spouse's name"
                  register={register}
                  errors={errors}
                />
                <TextField<FuneralSubmission>
                  name="yearsMarried"
                  label="How many years married?"
                  register={register}
                  errors={errors}
                />
              </div>
            </>
          )}

          <TextareaField<FuneralSubmission>
            name="childrenNames"
            label="Names of children"
            rows={2}
            register={register}
            errors={errors}
          />
          <TextareaField<FuneralSubmission>
            name="grandchildrenNames"
            label="Names of grandchildren"
            rows={2}
            register={register}
            errors={errors}
          />
          <TextareaField<FuneralSubmission>
            name="greatGrandchildrenNames"
            label="Names of great-grandchildren"
            rows={2}
            register={register}
            errors={errors}
          />
          <TextareaField<FuneralSubmission>
            name="siblingsNames"
            label="Names of brothers / sisters"
            rows={2}
            register={register}
            errors={errors}
          />
          <TextareaField<FuneralSubmission>
            name="parentsNames"
            label="Names of parents (please indicate if living or deceased)"
            rows={2}
            register={register}
            errors={errors}
          />

          <RadioField<FuneralSubmission>
            name="wasParishioner"
            label="Was the deceased a parishioner?"
            options={YES_NO}
            register={register}
            errors={errors}
          />
          <AddressBlock<FuneralSubmission>
            baseName="deceasedAddress"
            label="Deceased's address"
            register={register}
            errors={errors}
          />
        </FormSection>

        <FormSection id="kin" eyebrow="Section 4" title="Next of kin">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField<FuneralSubmission>
              name="kinFirstName"
              label="First name"
              register={register}
              errors={errors}
            />
            <TextField<FuneralSubmission>
              name="kinLastName"
              label="Last name"
              register={register}
              errors={errors}
            />
          </div>
          <TextField<FuneralSubmission>
            name="kinRelation"
            label="Relation to the deceased"
            register={register}
            errors={errors}
          />
          <AddressBlock<FuneralSubmission>
            baseName="kinAddress"
            label="Address"
            register={register}
            errors={errors}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField<FuneralSubmission>
              name="kinEmail"
              label="Email"
              type="email"
              register={register}
              errors={errors}
            />
            <TextField<FuneralSubmission>
              name="kinPhone"
              label="Phone / Mobile"
              type="tel"
              register={register}
              errors={errors}
            />
          </div>
        </FormSection>

        <FormSection
          id="background"
          eyebrow="Section 5"
          title="Background"
          description="A few details that help the celebrant prepare a personal homily."
        >
          <TextareaField<FuneralSubmission>
            name="occupation"
            label="What was the deceased's occupation?"
            register={register}
            errors={errors}
          />
          <TextareaField<FuneralSubmission>
            name="specialQualities"
            label="What are some qualities that made this person special?"
            rows={5}
            register={register}
            errors={errors}
          />
          <TextareaField<FuneralSubmission>
            name="hobbies"
            label="Please indicate any special interests, hobbies, or talents"
            rows={4}
            register={register}
            errors={errors}
          />
        </FormSection>

        <FormSection id="faith" eyebrow="Section 6" title="Faith life">
          <TextareaField<FuneralSubmission>
            name="relationshipWithGod"
            label="How did this person see their relationship with God?"
            rows={5}
            register={register}
            errors={errors}
          />
          <TextareaField<FuneralSubmission>
            name="parishInvolvement"
            label="Were they involved in any ministries of the parish?"
            rows={3}
            register={register}
            errors={errors}
          />
          <TextareaField<FuneralSubmission>
            name="primaryCaregivers"
            label="Who were the primary caregivers?"
            rows={3}
            register={register}
            errors={errors}
          />
          <TextareaField<FuneralSubmission>
            name="specialRequests"
            label="Please note any special requests you may have for the celebrant"
            rows={4}
            register={register}
            errors={errors}
          />
        </FormSection>

        <FormSection
          id="burial"
          eyebrow="Section 7"
          title="The Mass of Christian Burial"
        >
          <RadioField<FuneralSubmission>
            name="remains"
            label="Casket or cremated remains?"
            options={REMAINS_KINDS}
            required
            register={register}
            errors={errors}
          />
          {watchRemains === "Other" && (
            <TextField<FuneralSubmission>
              name="remainsOther"
              label="Please specify"
              register={register}
              errors={errors}
            />
          )}
          <RadioField<FuneralSubmission>
            name="familyPlacesPall"
            label="Will family members place the pall over the casket?"
            options={YES_NO_NA}
            required
            register={register}
            errors={errors}
          />
        </FormSection>

        <FormSection
          id="readings"
          eyebrow="Section 8"
          title="Readings and lectors"
          description="If your family chooses not to read at the Mass, members of our Funeral Support Ministry Team will be happy to assist."
        >
          <RadioField<FuneralSubmission>
            name="familyChoosesPassages"
            label="Will your family choose the Scripture passages?"
            options={YES_NO}
            required
            register={register}
            errors={errors}
          />

          {watchFamilyChooses === "Yes" && (
            <>
              <SelectField<FuneralSubmission>
                name="firstReading"
                label="First Reading"
                options={FIRST_READING_OPTIONS}
                hint="Codes match the Funeral Readings PDF linked at the top of this page."
                register={register}
                errors={errors}
              />
              <SelectField<FuneralSubmission>
                name="secondReading"
                label="Second Reading"
                options={SECOND_READING_OPTIONS}
                register={register}
                errors={errors}
              />
              <SelectField<FuneralSubmission>
                name="intercessionOption"
                label="Intercession option"
                options={INTERCESSION_OPTIONS}
                register={register}
                errors={errors}
              />
            </>
          )}

          <RadioField<FuneralSubmission>
            name="familyMemberReader"
            label="Will a family member or friend serve as a reader during the Mass?"
            options={YES_NO}
            required
            register={register}
            errors={errors}
          />

          {watchFamilyReader === "Yes" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField<FuneralSubmission>
                name="readerFirstReading"
                label="Reader — First Reading"
                register={register}
                errors={errors}
              />
              <TextField<FuneralSubmission>
                name="readerSecondReading"
                label="Reader — Second Reading"
                register={register}
                errors={errors}
              />
              <TextField<FuneralSubmission>
                name="readerPrayerFaithful"
                label="Reader — Prayer of the Faithful"
                register={register}
                errors={errors}
              />
            </div>
          )}

          <TextareaField<FuneralSubmission>
            name="giftBearers"
            label="Please choose 2 or 3 family members or friends to offer the gifts of bread and wine"
            rows={3}
            register={register}
            errors={errors}
          />

          <RadioField<FuneralSubmission>
            name="wordsOfRemembrance"
            label="Will someone deliver Words of Remembrance?"
            options={YES_NO}
            required
            register={register}
            errors={errors}
          />

          {watchWordsRemembrance === "Yes" && (
            <TextField<FuneralSubmission>
              name="wordsOfRemembrancePerson"
              label="Name of person delivering Words of Remembrance"
              hint="Please keep Words of Remembrance to 3-5 minutes."
              register={register}
              errors={errors}
            />
          )}
        </FormSection>

        <FormSection
          id="livestream"
          eyebrow="Section 9"
          title="Livestream"
          description="We can livestream funerals. Upon confirmation, you'll receive a private link to share with family and friends."
        >
          <RadioField<FuneralSubmission>
            name="livestreamRequested"
            label="Would you like the service to be livestreamed?"
            options={YES_NO}
            required
            register={register}
            errors={errors}
          />
        </FormSection>

        <FormSection
          id="music"
          eyebrow="Section 10"
          title="Music for the Mass"
          description="Reasonable requests for music not on these lists can be accommodated. If there are no preferences, the musician will choose appropriate hymns. Questions? Contact Adrian Soltys, Director of Liturgy and Music, at 908-232-1214 ext 121."
        >
          <SelectField<FuneralSubmission>
            name="entranceHymn"
            label="Entrance"
            options={ENTRANCE_HYMNS}
            register={register}
            errors={errors}
          />
          <SelectField<FuneralSubmission>
            name="psalm"
            label="Psalm"
            options={PSALM_OPTIONS}
            register={register}
            errors={errors}
          />
          <SelectField<FuneralSubmission>
            name="preparationHymn"
            label="Preparation"
            options={PREPARATION_HYMNS}
            register={register}
            errors={errors}
          />
          <SelectField<FuneralSubmission>
            name="communionHymn"
            label="Communion"
            options={COMMUNION_HYMNS}
            register={register}
            errors={errors}
          />
          <SelectField<FuneralSubmission>
            name="commendationHymn"
            label="Commendation"
            options={COMMENDATION_HYMNS}
            register={register}
            errors={errors}
          />
          <SelectField<FuneralSubmission>
            name="recessionalHymn"
            label="Recessional"
            options={RECESSIONAL_HYMNS}
            register={register}
            errors={errors}
          />
          <TextareaField<FuneralSubmission>
            name="otherMusicRequests"
            label="Other music requests"
            rows={4}
            register={register}
            errors={errors}
          />
        </FormSection>

        <div className="flex flex-col gap-3 rounded-lg border border-rule bg-cream p-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-2">
            By submitting, you&rsquo;ll receive an email confirmation and Father
            will reach out to confirm the details with you.
          </p>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-pill bg-rust px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rust-dark disabled:opacity-70"
          >
            {isSubmitting ? "Submitting…" : "Submit funeral intake"}
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </form>
    </div>
  );
}
