"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { INQUIRY_STATUSES, type InquiryStatus } from "@/db/schema";
import {
  addInquiryNoteAction,
  assignInquiryAction,
  updateInquiryStatusAction,
} from "../_actions";

const STATUS_LABELS: Record<InquiryStatus, string> = {
  new: "New",
  contacted: "Contacted",
  joined: "Joined",
  declined: "Declined",
  stuck: "Stuck",
};

type LeadOption = { id: string; name: string | null; email: string };

export function InquiryActions({
  inquiryId,
  currentStatus,
  currentNotes,
  currentAssigneeId,
  assignee,
  leadOptions,
}: {
  inquiryId: string;
  currentStatus: InquiryStatus;
  currentNotes: string;
  currentAssigneeId: string | null;
  assignee: { id: string; name: string | null; email: string } | null;
  leadOptions: LeadOption[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<InquiryStatus>(currentStatus);
  const [reasonCode, setReasonCode] = useState("");
  const [notes, setNotes] = useState(currentNotes);
  const [assigneeId, setAssigneeId] = useState<string | "">(currentAssigneeId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const onSaveStatus = () => {
    setError(null);
    start(async () => {
      const r = await updateInquiryStatusAction({
        inquiryId,
        status,
        reasonCode: reasonCode.trim() ? reasonCode.trim() : null,
        notes: null,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setSavedAt("Status updated.");
      router.refresh();
    });
  };

  const onSaveNotes = () => {
    setError(null);
    start(async () => {
      const r = await addInquiryNoteAction({ inquiryId, notes });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setSavedAt("Note saved.");
      router.refresh();
    });
  };

  const onAssign = () => {
    setError(null);
    start(async () => {
      const r = await assignInquiryAction({
        inquiryId,
        assigneeId: assigneeId || null,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setSavedAt("Assignee updated.");
      router.refresh();
    });
  };

  return (
    <>
      <div className="rounded-lg border border-rule bg-white p-5">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-3">
          Status
        </h3>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as InquiryStatus)}
          disabled={pending}
          className="form-input mt-3"
        >
          {INQUIRY_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        {(status === "declined" || status === "stuck") && (
          <input
            type="text"
            value={reasonCode}
            onChange={(e) => setReasonCode(e.target.value)}
            placeholder="Reason (optional)"
            maxLength={80}
            disabled={pending}
            className="form-input mt-2 text-sm"
          />
        )}
        <button
          type="button"
          onClick={onSaveStatus}
          disabled={pending || status === currentStatus}
          className="mt-3 w-full rounded-pill bg-navy px-4 py-2 text-xs font-semibold text-white hover:bg-navy-light disabled:opacity-60"
        >
          {pending ? "…" : "Update status"}
        </button>
      </div>

      <div className="rounded-lg border border-rule bg-white p-5">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-3">
          Assignee
        </h3>
        <p className="mt-1 text-xs text-ink-3">
          {assignee
            ? `Currently ${assignee.name ?? assignee.email}`
            : "Unassigned"}
        </p>
        <select
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
          disabled={pending || leadOptions.length === 0}
          className="form-input mt-3"
        >
          <option value="">— Unassigned —</option>
          {leadOptions.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name ?? u.email}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onAssign}
          disabled={pending || assigneeId === (currentAssigneeId ?? "")}
          className="mt-3 w-full rounded-pill bg-navy px-4 py-2 text-xs font-semibold text-white hover:bg-navy-light disabled:opacity-60"
        >
          {pending ? "…" : "Save assignee"}
        </button>
        {leadOptions.length === 0 && (
          <p className="mt-2 text-[11px] text-ink-3">
            No leads assigned to this ministry yet — add one in Users &amp; roles.
          </p>
        )}
      </div>

      <div className="rounded-lg border border-rule bg-white p-5">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-3">
          Notes
        </h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          maxLength={5000}
          disabled={pending}
          placeholder="Internal notes — not visible to the visitor."
          className="form-input mt-3 text-sm"
        />
        <button
          type="button"
          onClick={onSaveNotes}
          disabled={pending || notes === currentNotes}
          className="mt-3 w-full rounded-pill bg-rust px-4 py-2 text-xs font-semibold text-white hover:bg-rust-dark disabled:opacity-60"
        >
          {pending ? "…" : "Save note"}
        </button>
      </div>

      {error && (
        <p className="rounded-md border-l-4 border-rust bg-rust-pale px-3 py-2 text-xs text-rust-dark">
          {error}
        </p>
      )}
      {savedAt && !error && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
          {savedAt}
        </p>
      )}
    </>
  );
}
