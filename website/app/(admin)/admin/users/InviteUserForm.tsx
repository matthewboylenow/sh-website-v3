"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AdminField } from "@/components/admin/AdminField";
import { ROLES } from "@/lib/validators/users";
import { inviteUserAction } from "./_actions";

export function InviteUserForm({
  ministryOptions,
}: {
  ministryOptions: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [topError, setTopError] = useState<string | null>(null);
  const [role, setRole] = useState<"admin" | "editor" | "ministry_lead">("editor");
  const [ministryIds, setMinistryIds] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  const onSubmit = (formData: FormData) => {
    setErrors({});
    setTopError(null);
    start(async () => {
      const result = await inviteUserAction(formData);
      if (result.ok) {
        router.refresh();
        setOpen(false);
        setMinistryIds([]);
      } else if ("fieldErrors" in result) {
        setErrors(result.fieldErrors);
      } else {
        setTopError(result.error);
      }
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-pill bg-rust px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rust-dark"
      >
        + Invite user
      </button>
    );
  }

  return (
    <form
      action={onSubmit}
      className="rounded-lg border border-rule bg-white p-6 shadow-md"
    >
      <input type="hidden" name="ministryIds" value={ministryIds.join(",")} />

      <div className="flex items-baseline justify-between">
        <h2 className="font-serif text-lg font-bold text-navy">Invite user</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs font-semibold text-ink-3 hover:text-rust-dark"
        >
          Cancel
        </button>
      </div>

      {topError && (
        <div className="mt-4 rounded-md border-l-4 border-rust bg-rust-pale px-4 py-3 text-sm text-rust-dark">
          {topError}
        </div>
      )}

      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <AdminField name="email" label="Email" required errors={errors.email}>
          <input
            id="email-input"
            name="email"
            type="email"
            required
            className="form-input"
            placeholder="leader@example.com"
          />
        </AdminField>
        <AdminField name="name" label="Name" errors={errors.name}>
          <input
            id="name-input"
            name="name"
            type="text"
            className="form-input"
          />
        </AdminField>
        <AdminField name="phone" label="Phone (optional)" errors={errors.phone}>
          <input
            id="phone-input"
            name="phone"
            type="tel"
            placeholder="+19085551234"
            className="form-input"
          />
        </AdminField>
        <AdminField name="role" label="Role" required errors={errors.role}>
          <select
            id="role-input"
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value as typeof role)}
            className="form-input"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {prettyRole(r)}
              </option>
            ))}
          </select>
        </AdminField>
      </div>

      <AdminField
        name="ministryIds"
        label={role === "ministry_lead" ? "Ministries (required)" : "Ministries (optional)"}
        hint={
          role === "ministry_lead"
            ? "Pick one or more ministries this person will lead."
            : "Admins / editors can also lead specific ministries — receive their inquiries, edit their pages."
        }
        errors={errors.ministryIds}
        className="mt-4"
      >
        <MinistryPicker
          options={ministryOptions}
          selected={ministryIds}
          onChange={setMinistryIds}
        />
      </AdminField>

      <div className="mt-6 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-pill bg-rust px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rust-dark disabled:opacity-70"
        >
          {pending ? "Inviting…" : "Send invite"}
        </button>
        <p className="text-xs text-ink-3">
          The user can sign in immediately at <code className="font-mono">/sign-in</code>.
        </p>
      </div>
    </form>
  );
}

export function MinistryPicker({
  options,
  selected,
  onChange,
}: {
  options: { id: string; name: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);

  if (options.length === 0) {
    return (
      <p className="text-xs text-ink-3">No ministries yet.</p>
    );
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {options.map((m) => {
        const active = selected.includes(m.id);
        return (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => toggle(m.id)}
              aria-pressed={active}
              className={`rounded-pill border px-3 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? "border-rust bg-rust text-white"
                  : "border-rule bg-white text-ink-2 hover:border-rust"
              }`}
            >
              {m.name}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function prettyRole(r: "admin" | "editor" | "ministry_lead") {
  return r === "ministry_lead" ? "Ministry lead" : r.charAt(0).toUpperCase() + r.slice(1);
}
