"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  approveMinistryEditAction,
  rejectMinistryEditAction,
} from "./_actions";

export function ApprovalActions({ editId }: { editId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onApprove = () => {
    setError(null);
    start(async () => {
      const r = await approveMinistryEditAction(editId);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  };

  const onReject = () => {
    setError(null);
    start(async () => {
      const r = await rejectMinistryEditAction(editId, note);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-md bg-rust-pale px-3 py-2 text-xs text-rust-dark">
          {error}
        </p>
      )}
      {!rejectOpen ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onApprove}
            disabled={pending}
            className="rounded-pill bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-70"
          >
            {pending ? "…" : "Approve"}
          </button>
          <button
            type="button"
            onClick={() => setRejectOpen(true)}
            disabled={pending}
            className="rounded-pill border border-rule bg-white px-4 py-2 text-xs font-semibold text-ink-2 hover:border-rust hover:text-rust-dark disabled:opacity-70"
          >
            Reject
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Reason (sent back to the lead)…"
            className="form-input"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onReject}
              disabled={pending}
              className="rounded-pill bg-rust px-4 py-2 text-xs font-semibold text-white hover:bg-rust-dark disabled:opacity-70"
            >
              {pending ? "…" : "Send rejection"}
            </button>
            <button
              type="button"
              onClick={() => {
                setRejectOpen(false);
                setNote("");
              }}
              className="rounded-pill border border-rule bg-white px-4 py-2 text-xs font-semibold text-ink-2 hover:border-navy"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
