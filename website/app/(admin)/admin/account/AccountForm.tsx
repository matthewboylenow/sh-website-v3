"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AdminField } from "@/components/admin/AdminField";
import { updateAccountAction } from "./_actions";

type Values = {
  name: string | null;
  phone: string | null;
  preferredAuthMethod: "email" | "sms";
};

export function AccountForm({ initial }: { initial: Values }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [topError, setTopError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const onSubmit = (formData: FormData) => {
    setErrors({});
    setTopError(null);
    setSaved(false);
    start(async () => {
      const result = await updateAccountAction(formData);
      if (result.ok) {
        setSaved(true);
        router.refresh();
      } else if ("fieldErrors" in result) {
        setErrors(result.fieldErrors);
      } else {
        setTopError(result.error);
      }
    });
  };

  return (
    <form action={onSubmit} className="space-y-5">
      {topError && (
        <div className="rounded-md border-l-4 border-rust bg-rust-pale px-4 py-3 text-sm text-rust-dark">
          {topError}
        </div>
      )}
      {saved && (
        <div className="rounded-md border-l-4 border-emerald-500 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Saved.
        </div>
      )}

      <AdminField name="name" label="Name" errors={errors.name}>
        <input
          id="name-input"
          name="name"
          type="text"
          defaultValue={initial.name ?? ""}
          maxLength={200}
          className="form-input"
        />
      </AdminField>

      <AdminField
        name="phone"
        label="Phone"
        hint="E.164 format — leading +, country code, digits. Used for SMS sign-in."
        errors={errors.phone}
      >
        <input
          id="phone-input"
          name="phone"
          type="tel"
          defaultValue={initial.phone ?? ""}
          placeholder="+19085551234"
          className="form-input"
        />
      </AdminField>

      <AdminField
        name="preferredAuthMethod"
        label="Preferred sign-in"
        hint="Which method we suggest first when you visit /sign-in. Both are always available."
      >
        <select
          id="preferredAuthMethod-input"
          name="preferredAuthMethod"
          defaultValue={initial.preferredAuthMethod}
          className="form-input"
        >
          <option value="email">Email magic link</option>
          <option value="sms">SMS code</option>
        </select>
      </AdminField>

      <button
        type="submit"
        disabled={pending}
        className="rounded-pill bg-rust px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rust-dark disabled:opacity-70"
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
