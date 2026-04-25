/**
 * Form-field wrapper used across all admin editors. Pairs a label with
 * an input + optional hint + zod-style error. Caller renders the input
 * itself as a child so any input type works (text, select, textarea,
 * checkbox grids, etc.).
 */
export function AdminField({
  name,
  label,
  required,
  hint,
  errors,
  className = "",
  children,
}: {
  name: string;
  label: string;
  required?: boolean;
  hint?: string;
  errors?: string[];
  className?: string;
  children: React.ReactNode;
}) {
  const errId = errors?.length ? `${name}-err` : undefined;
  return (
    <label htmlFor={`${name}-input`} className={`block ${className}`}>
      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-3">
        {label}
        {required && <span className="ml-1 text-rust">*</span>}
      </span>
      <div className="mt-1">{children}</div>
      {hint && !errors?.length && (
        <p className="mt-1 text-xs text-ink-3">{hint}</p>
      )}
      {errors?.length ? (
        <p id={errId} className="mt-1 text-xs text-rust-dark">
          {errors.join(" · ")}
        </p>
      ) : null}
    </label>
  );
}
