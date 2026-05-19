"use client";

import type { ReactNode } from "react";
import {
  type FieldError,
  type FieldErrors,
  type UseFormRegister,
  type Path,
  type FieldValues,
} from "react-hook-form";

/**
 * Shared field primitives for the public intake forms (funeral,
 * baptism). Same visual treatment as WelcomeForm — uppercase eyebrow
 * label, rounded white inputs, rust focus ring, inline error text.
 *
 * Built on react-hook-form so any form using these atoms can take
 * advantage of Zod resolver + per-field error display by passing
 * `register` + `errors` from useForm().
 */

const inputClass = (error?: boolean) =>
  `w-full rounded-md border bg-white px-4 py-2 text-sm text-ink transition-colors placeholder:text-ink-4 focus:outline-none focus:ring-2 focus:ring-rust/60 ${
    error ? "border-rust" : "border-rule"
  }`;

function getError<T extends FieldValues>(
  errors: FieldErrors<T>,
  name: Path<T>,
): FieldError | undefined {
  const parts = (name as string).split(".");
  let cur: unknown = errors;
  for (const p of parts) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur as FieldError | undefined;
}

export function FieldLabel({
  htmlFor,
  children,
  required,
  hint,
}: {
  htmlFor?: string;
  children: ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="mb-1">
      <label
        htmlFor={htmlFor}
        className="block text-xs font-semibold uppercase tracking-[0.08em] text-ink-3"
      >
        {children}
        {required && <span className="ml-1 text-rust">*</span>}
      </label>
      {hint && <p className="mt-1 text-xs text-ink-3">{hint}</p>}
    </div>
  );
}

export function TextField<T extends FieldValues>({
  name,
  label,
  type = "text",
  required,
  hint,
  placeholder,
  autoComplete,
  register,
  errors,
}: {
  name: Path<T>;
  label: string;
  type?: "text" | "email" | "tel" | "date" | "url";
  required?: boolean;
  hint?: string;
  placeholder?: string;
  autoComplete?: string;
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
}) {
  const err = getError(errors, name);
  const id = name as string;
  return (
    <div>
      <FieldLabel htmlFor={id} required={required} hint={hint}>
        {label}
      </FieldLabel>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={inputClass(Boolean(err))}
        aria-invalid={Boolean(err)}
        aria-describedby={err ? `${id}-err` : undefined}
        {...register(name)}
      />
      {err?.message && (
        <p id={`${id}-err`} className="mt-1 text-xs text-rust-dark">
          {err.message}
        </p>
      )}
    </div>
  );
}

export function TextareaField<T extends FieldValues>({
  name,
  label,
  required,
  hint,
  rows = 4,
  register,
  errors,
}: {
  name: Path<T>;
  label: string;
  required?: boolean;
  hint?: string;
  rows?: number;
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
}) {
  const err = getError(errors, name);
  const id = name as string;
  return (
    <div>
      <FieldLabel htmlFor={id} required={required} hint={hint}>
        {label}
      </FieldLabel>
      <textarea
        id={id}
        rows={rows}
        className={inputClass(Boolean(err))}
        aria-invalid={Boolean(err)}
        aria-describedby={err ? `${id}-err` : undefined}
        {...register(name)}
      />
      {err?.message && (
        <p id={`${id}-err`} className="mt-1 text-xs text-rust-dark">
          {err.message}
        </p>
      )}
    </div>
  );
}

export function SelectField<T extends FieldValues>({
  name,
  label,
  options,
  required,
  hint,
  register,
  errors,
  placeholder = "— Select —",
}: {
  name: Path<T>;
  label: string;
  options: readonly string[];
  required?: boolean;
  hint?: string;
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
  placeholder?: string;
}) {
  const err = getError(errors, name);
  const id = name as string;
  return (
    <div>
      <FieldLabel htmlFor={id} required={required} hint={hint}>
        {label}
      </FieldLabel>
      <select
        id={id}
        className={inputClass(Boolean(err))}
        aria-invalid={Boolean(err)}
        aria-describedby={err ? `${id}-err` : undefined}
        defaultValue=""
        {...register(name)}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {err?.message && (
        <p id={`${id}-err`} className="mt-1 text-xs text-rust-dark">
          {err.message}
        </p>
      )}
    </div>
  );
}

export function RadioField<T extends FieldValues>({
  name,
  label,
  options,
  required,
  hint,
  register,
  errors,
}: {
  name: Path<T>;
  label: string;
  options: readonly string[];
  required?: boolean;
  hint?: string;
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
}) {
  const err = getError(errors, name);
  return (
    <fieldset>
      <legend className="block text-xs font-semibold uppercase tracking-[0.08em] text-ink-3">
        {label}
        {required && <span className="ml-1 text-rust">*</span>}
      </legend>
      {hint && <p className="mt-1 text-xs text-ink-3">{hint}</p>}
      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
        {options.map((o) => (
          <label
            key={o}
            className="inline-flex items-center gap-2 text-sm text-ink"
          >
            <input
              type="radio"
              value={o}
              className="h-4 w-4 border-rule text-rust focus:ring-rust"
              {...register(name)}
            />
            {o}
          </label>
        ))}
      </div>
      {err?.message && (
        <p className="mt-1 text-xs text-rust-dark">{err.message}</p>
      )}
    </fieldset>
  );
}

export function AddressBlock<T extends FieldValues>({
  baseName,
  label,
  hint,
  register,
  errors,
}: {
  baseName: string;
  label: string;
  hint?: string;
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
}) {
  return (
    <fieldset className="rounded-md border border-rule bg-cream/40 p-4">
      <legend className="px-1 text-xs font-semibold uppercase tracking-[0.08em] text-ink-3">
        {label}
      </legend>
      {hint && <p className="mb-3 text-xs text-ink-3">{hint}</p>}
      <div className="space-y-3">
        <TextField<T>
          name={`${baseName}.line1` as Path<T>}
          label="Street address"
          autoComplete="address-line1"
          register={register}
          errors={errors}
        />
        <TextField<T>
          name={`${baseName}.line2` as Path<T>}
          label="Apt / suite"
          autoComplete="address-line2"
          register={register}
          errors={errors}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField<T>
            name={`${baseName}.city` as Path<T>}
            label="City"
            autoComplete="address-level2"
            register={register}
            errors={errors}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField<T>
              name={`${baseName}.state` as Path<T>}
              label="State"
              autoComplete="address-level1"
              register={register}
              errors={errors}
            />
            <TextField<T>
              name={`${baseName}.zip` as Path<T>}
              label="ZIP"
              autoComplete="postal-code"
              register={register}
              errors={errors}
            />
          </div>
        </div>
      </div>
    </fieldset>
  );
}

export function FormSection({
  id,
  eyebrow,
  title,
  description,
  children,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-h`}
      className="scroll-mt-24 rounded-lg border border-rule bg-white p-6 shadow-sm sm:p-8"
    >
      {eyebrow && (
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rust">
          {eyebrow}
        </p>
      )}
      <h2
        id={`${id}-h`}
        className="mt-1 font-serif text-2xl font-bold text-navy"
      >
        {title}
      </h2>
      {description && (
        <p className="mt-2 text-sm leading-relaxed text-ink-2">{description}</p>
      )}
      <div className="mt-6 space-y-4">{children}</div>
    </section>
  );
}
