"use client";

import { useState } from "react";

type Tag = { id: string; name: string };

type IngredientRow = { key: number };

let nextRowKey = 0;
function newRow(): IngredientRow {
  return { key: nextRowKey++ };
}

const fieldClass =
  "rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 outline-none focus:border-orange-400";

export function CocktailForm({
  action,
  primaryTags,
  styleTags,
}: {
  action: (formData: FormData) => void;
  primaryTags: Tag[];
  styleTags: Tag[];
}) {
  // Only the row *count and identity* is client state — each row's text
  // stays an uncontrolled input, so typing never re-renders the form.
  const [rows, setRows] = useState<IngredientRow[]>([newRow(), newRow(), newRow()]);

  return (
    <form action={action} className="flex flex-col gap-8">
      <label className="flex flex-col gap-1 text-sm text-zinc-300">
        <span>
          Cocktail name <span className="text-orange-400">*</span>
        </span>
        <input name="name" required className={fieldClass} placeholder="Last Word" />
      </label>

      <div>
        <p className="text-sm text-zinc-300">
          Ingredients <span className="text-orange-400">*</span>
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">
          At least one is required. Amount, unit, and note are optional —
          unusual measurements are fine as free text.
        </p>
        <div className="mt-3 flex flex-col gap-3">
          {rows.map((row) => (
            <div
              key={row.key}
              className="flex flex-wrap items-center gap-2 rounded-md border border-zinc-800 p-2 sm:border-none sm:p-0"
            >
              <input
                name="ingredient_display_name"
                placeholder="Ingredient (e.g. gin)"
                className={`${fieldClass} min-w-[9rem] flex-1`}
              />
              <input
                name="ingredient_amount"
                placeholder="2"
                inputMode="decimal"
                className={`${fieldClass} w-16 shrink-0`}
              />
              <input
                name="ingredient_unit"
                placeholder="oz"
                className={`${fieldClass} w-16 shrink-0`}
              />
              <input
                name="ingredient_qualifier"
                placeholder="Note (e.g. fresh)"
                className={`${fieldClass} min-w-[9rem] flex-1`}
              />
              <button
                type="button"
                aria-label="Remove ingredient"
                onClick={() => setRows((r) => r.filter((x) => x.key !== row.key))}
                className="shrink-0 rounded-md px-2 py-2 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setRows((r) => [...r, newRow()])}
          className="mt-3 rounded-full border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-zinc-500"
        >
          + Add ingredient
        </button>
      </div>

      <label className="flex flex-col gap-1 text-sm text-zinc-300">
        Instructions
        <textarea
          name="instructions"
          rows={4}
          className={fieldClass}
          placeholder="Shake with ice, double strain into a coupe."
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm text-zinc-300">
          Garnish
          <input name="garnish" className={fieldClass} placeholder="Lemon twist" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-300">
          Glassware
          <input name="glassware" className={fieldClass} placeholder="Coupe" />
        </label>
      </div>

      {primaryTags.length > 0 && (
        <fieldset>
          <legend className="text-sm text-zinc-300">Primary ingredient</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {primaryTags.map((tag) => (
              <label
                key={tag.id}
                className="flex cursor-pointer items-center gap-1.5 rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200 has-[:checked]:border-orange-400 has-[:checked]:text-orange-300"
              >
                <input
                  type="checkbox"
                  name="tag_ids"
                  value={tag.id}
                  className="sr-only"
                />
                {tag.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {styleTags.length > 0 && (
        <fieldset>
          <legend className="text-sm text-zinc-300">Style</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {styleTags.map((tag) => (
              <label
                key={tag.id}
                className="flex cursor-pointer items-center gap-1.5 rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200 has-[:checked]:border-orange-400 has-[:checked]:text-orange-300"
              >
                <input
                  type="checkbox"
                  name="tag_ids"
                  value={tag.id}
                  className="sr-only"
                />
                {tag.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <label className="flex flex-col gap-1 text-sm text-zinc-300">
        Source
        <input
          name="source"
          className={fieldClass}
          placeholder="e.g. Apple Notes, a book, a bar you loved"
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-zinc-300">
        <input type="checkbox" name="favorite" className="accent-orange-500" />
        Mark as favorite
      </label>

      <button
        type="submit"
        className="self-start rounded-full bg-orange-500 px-5 py-2 text-sm font-medium text-zinc-950 hover:bg-orange-400"
      >
        Save cocktail
      </button>
    </form>
  );
}
