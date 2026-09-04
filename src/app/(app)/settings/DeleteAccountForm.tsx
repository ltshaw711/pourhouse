"use client";

import { useActionState } from "react";
import { deleteAccount } from "./actions";

export function DeleteAccountForm() {
  const [state, formAction, isPending] = useActionState(deleteAccount, null);

  return (
    <form action={formAction} className="mt-4 flex flex-col items-start gap-3">
      <label className="flex flex-col gap-1 text-sm text-zinc-300">
        Type DELETE to confirm
        <input
          name="confirm"
          required
          autoComplete="off"
          className="w-40 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 outline-none focus:border-red-500"
        />
      </label>

      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-60"
      >
        {isPending ? "Deleting…" : "Delete my account"}
      </button>
    </form>
  );
}
