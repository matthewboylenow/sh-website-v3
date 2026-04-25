"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteBlobAssetAction } from "./_actions";

export function DeleteAssetButton({ assetKey }: { assetKey: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onDelete = () => {
    if (!confirm(`Delete asset "${assetKey}"? This can't be undone.`)) return;
    setError(null);
    start(async () => {
      const r = await deleteBlobAssetAction(assetKey);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onDelete}
        disabled={pending}
        className="text-xs font-semibold text-rust-dark hover:text-rust disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      {error && (
        <p className="max-w-[260px] text-right text-[11px] text-rust-dark">
          {error}
        </p>
      )}
    </div>
  );
}
