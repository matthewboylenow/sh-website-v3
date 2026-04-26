"use client";

import { useTransition } from "react";
import { deletePageAndRedirect } from "../_actions";

export function DeletePageButton({ pageId }: { pageId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (
          confirm(
            "Delete this page and all its sections? This can't be undone.",
          )
        ) {
          start(() => deletePageAndRedirect(pageId));
        }
      }}
      className="text-xs font-semibold text-rust-dark hover:text-rust disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete page"}
    </button>
  );
}
