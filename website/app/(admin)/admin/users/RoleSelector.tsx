"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ROLES } from "@/lib/validators/users";
import { setUserRoleAction } from "./_actions";

export function RoleSelector({
  userId,
  currentRole,
  currentMinistryId,
  ministryOptions,
  selfId,
}: {
  userId: string;
  currentRole: "admin" | "editor" | "ministry_lead";
  currentMinistryId: string | null;
  ministryOptions: { id: string; name: string }[];
  selfId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  if (userId === selfId) {
    return (
      <span className="text-xs text-ink-3" title="Use a different admin to change your own role.">
        {prettyRole(currentRole)} (you)
      </span>
    );
  }

  const onSubmit = (formData: FormData) => {
    start(async () => {
      const result = await setUserRoleAction(formData);
      if (!result.ok && "error" in result) {
        alert(result.error);
      }
      router.refresh();
    });
  };

  return (
    <form action={onSubmit} className="flex items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <select
        name="role"
        defaultValue={currentRole}
        disabled={pending}
        className="rounded-md border border-rule bg-white px-2 py-1 text-xs text-ink"
        onChange={(e) => {
          // For ministry_lead role, require a ministry choice — open a prompt if missing.
          if (e.target.value === "ministry_lead" && !currentMinistryId && ministryOptions.length === 0) {
            alert("Add a ministry first.");
            e.target.value = currentRole;
          }
        }}
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {prettyRole(r)}
          </option>
        ))}
      </select>
      <select
        name="ministryId"
        defaultValue={currentMinistryId ?? ""}
        disabled={pending}
        className="rounded-md border border-rule bg-white px-2 py-1 text-xs text-ink"
      >
        <option value="">— No ministry —</option>
        {ministryOptions.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="rounded-pill bg-navy px-3 py-1 text-xs font-semibold text-white hover:bg-navy-light disabled:opacity-70"
      >
        {pending ? "…" : "Save"}
      </button>
    </form>
  );
}

function prettyRole(r: "admin" | "editor" | "ministry_lead") {
  return r === "ministry_lead" ? "Ministry lead" : r.charAt(0).toUpperCase() + r.slice(1);
}
