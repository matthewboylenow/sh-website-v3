"use client";

import { useTransition } from "react";
import { deleteAnswerCardAndRedirect } from "../_actions";

export function DeleteAnswerCardButton({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        // Deleting loses the card's history in the reports too, which is
        // not obvious from the button.
        const ok = window.confirm(
          `Delete "${title}"? This cannot be undone, and the card's feedback history goes with it. Archiving instead keeps both.`,
        );
        if (ok) start(() => void deleteAnswerCardAndRedirect(id));
      }}
      className="rounded-pill border border-rule px-4 py-2 text-sm text-ink-3 hover:border-rust hover:text-rust-dark disabled:opacity-60"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
