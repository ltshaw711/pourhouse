"use client";

import { useActionState, useState } from "react";
import type { IngredientActionState, IngredientFormValues } from "@/lib/ingredient-form-values";

const fieldClass =
  "rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/40";

type Action = (
  state: IngredientActionState,
  formData: FormData
) => IngredientActionState | Promise<IngredientActionState>;

export function IngredientForm({
  action,
  initial,
  submitLabel = "Save ingredient",
}: {
  action: Action;
  initial?: IngredientFormValues;
  submitLabel?: string;
}) {
  const [state, formAction, isPending] = useActionState(action, null);

  // Same fix as CocktailForm: Next.js refreshes Server Components after a
  // Server Action even without redirect(), which can reset uncontrolled
  // inputs. Remount the fields (via key) whenever a new result arrives so
  // they pick up state.values fresh instead of losing what was typed.
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

      <IngredientFields key={formInstance} values={values} />

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

function IngredientFields({ values }: { values?: IngredientFormValues }) {
  return (
    <>
      <label className="flex flex-col gap-1 text-sm text-zinc-300">
        <span>
          Name <span className="text-orange-400">*</span>
        </span>
        <input
          name="canonical_name"
          required
          defaultValue={values?.canonical_name}
          className={fieldClass}
          placeholder="Blanco Tequila"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-zinc-300">
        Category
        <input
          name="category"
          defaultValue={values?.category}
          className={fieldClass}
          placeholder="tequila"
        />
        <span className="text-xs text-zinc-400">
          Optional grouping — matches the primary-ingredient tags where
          relevant (gin, vodka, tequila, etc.).
        </span>
      </label>

      <label className="flex flex-col gap-1 text-sm text-zinc-300">
        Aliases
        <input
          name="aliases"
          defaultValue={values?.aliasesText}
          className={fieldClass}
          placeholder="tequila, silver tequila"
        />
        <span className="text-xs text-zinc-400">
          Comma-separated. Typing any of these exactly (or the name above)
          in a recipe links that ingredient line to this one automatically.
        </span>
      </label>
    </>
  );
}
