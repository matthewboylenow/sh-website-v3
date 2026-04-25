"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ROLES } from "@/lib/validators/users";
import { setUserAction } from "./_actions";
import { MinistryPicker } from "./InviteUserForm";

export function RoleSelector({
  userId,
  currentRole,
  currentMinistryIds,
  ministryOptions,
  selfId,
}: {
  userId: string;
  currentRole: "admin" | "editor" | "ministry_lead";
  currentMinistryIds: string[];
  ministryOptions: { id: string; name: string }[];
  selfId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [role, setRole] = useState(currentRole);
  const [ministryIds, setMinistryIds] = useState<string[]>(currentMinistryIds);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (userId === selfId) {
    return (
      <div>
        <span className="text-xs text-ink-3" title="Use a different admin to change your own role.">
          {prettyRole(currentRole)} (you)
        </span>
        {currentMinistryIds.length > 0 && (
          <p className="mt-0.5 text-[11px] text-ink-3">
            Leads {currentMinistryIds.length} ministr
            {currentMinistryIds.length === 1 ? "y" : "ies"}
          </p>
        )}
      </div>
    );
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-left"
      >
        <span className="block text-sm text-ink">
          {prettyRole(currentRole)}
        </span>
        {currentMinistryIds.length > 0 && (
          <span className="block text-[11px] text-ink-3">
            {currentMinistryIds.length === 1
              ? "1 ministry"
              : `${currentMinistryIds.length} ministries`}
          </span>
        )}
        <span className="text-[11px] font-semibold text-rust-dark hover:text-rust">
          Edit →
        </span>
      </button>
    );
  }

  const onSave = () => {
    setError(null);
    const fd = new FormData();
    fd.set("userId", userId);
    fd.set("role", role);
    fd.set("ministryIds", ministryIds.join(","));
    start(async () => {
      const r = await setUserAction(fd);
      if (!r.ok && "error" in r) {
        setError(r.error);
        return;
      }
      if (!r.ok && "fieldErrors" in r) {
        setError(Object.values(r.fieldErrors).flat().join(" · "));
        return;
      }
      setEditing(false);
      router.refresh();
    });
  };

  return (
    <div className="space-y-2">
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as typeof role)}
        disabled={pending}
        className="form-input max-w-[200px]"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {prettyRole(r)}
          </option>
        ))}
      </select>
      <MinistryPicker
        options={ministryOptions}
        selected={ministryIds}
        onChange={setMinistryIds}
      />
      {error && <p className="text-[11px] text-rust-dark">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={pending}
          className="rounded-pill bg-navy px-3 py-1 text-xs font-semibold text-white hover:bg-navy-light disabled:opacity-70"
        >
          {pending ? "…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setRole(currentRole);
            setMinistryIds(currentMinistryIds);
          }}
          disabled={pending}
          className="rounded-pill border border-rule bg-white px-3 py-1 text-xs font-semibold text-ink-2 hover:border-navy"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function prettyRole(r: "admin" | "editor" | "ministry_lead") {
  return r === "ministry_lead" ? "Ministry lead" : r.charAt(0).toUpperCase() + r.slice(1);
}
