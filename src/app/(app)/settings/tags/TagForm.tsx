"use client";

import { useActionState, useState } from "react";
import type { TagActionState, TagFormValues } from "@/lib/tag-form-values";

const fieldClass =
  "rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/40";

type Action = (state: TagActionState, formData: FormData) => TagActionState | Promise<TagActionState>;

export function TagForm({
  action,
  initial,
  submitLabel = "Save tag",
}: {
  action: Action;
  initial?: TagFormValues;
  submitLabel?: string;
}) {
  const [state, formAction, isPending] = useActionState(action, null);

  // Same fix as CocktailForm/IngredientForm: Next.js refreshes Server
  // Components after a Server Action even without redirect(), which can
  // reset uncontrolled inputs. Remount the fields (via key) whenever a
  // new result arrives so they pick up state.values fresh instead of
  // losing what was typed.
  const [prevState, setPrevState] = useState(state);
  const [formInstance, setFormInstance] = useState(0);
  if (state !== prevState) {
    setPrevState(state);
    setFormInstance((n) => n + 1);
  }

  const values = state?.values ?? initial;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state?.error && (
        <p className="rounded-md border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <TagFields key={formInstance} values={values} />

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-full bg-orange-500 px-5 py-2 text-sm font-medium text-zinc-950 hover:bg-orange-400 disabled:opacity-60"
      >
        {isPending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}

function TagFields({ values }: { values?: TagFormValues }) {
  return (
    <>
      <label className="flex flex-col gap-1 text-sm text-zinc-300">
        <span>
          Name <span className="text-orange-400">*</span>
        </span>
        <input
          name="name"
          required
          defaultValue={values?.name}
          className={fieldClass}
          placeholder="Campari"
        />
      </label>

      <fieldset className="flex flex-col gap-1.5 text-sm text-zinc-300">
        <legend>
          Type <span className="text-orange-400">*</span>
        </legend>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="type"
            value="primary"
            defaultChecked={(values?.type ?? "primary") === "primary"}
            className="h-4 w-4"
          />
          Primary — the base spirit/category shown as the orange badge
          (Bourbon, Gin, Rum…)
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="type"
            value="style"
            defaultChecked={values?.type === "style"}
            className="h-4 w-4"
          />
          Style — a secondary descriptor (Classic, Tiki, Stirred…)
        </label>
      </fieldset>
    </>
  );
}
