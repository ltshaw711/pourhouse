"use client";

import { useActionState } from "react";
import type { UploadState } from "./actions";

export function UploadForm({
  action,
}: {
  action: (state: UploadState, formData: FormData) => UploadState | Promise<UploadState>;
}) {
  const [state, formAction, isPending] = useActionState(action, null);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm text-zinc-300">
        Notes exported as Markdown (.md)
        <input
          type="file"
          name="files"
          accept=".md,.txt,.html,.htm"
          multiple
          required
          className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 file:mr-3 file:rounded-full file:border-0 file:bg-orange-500 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-950"
        />
      </label>

      {state?.error && (
        <p className="rounded-md border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-full bg-orange-500 px-5 py-2 text-sm font-medium text-zinc-950 hover:bg-orange-400 disabled:opacity-60"
      >
        {isPending ? "Uploading…" : "Upload and preview"}
      </button>
    </form>
  );
}
