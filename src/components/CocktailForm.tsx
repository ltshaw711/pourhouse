"use client";

import { useState } from "react";

type Tag = { id: string; name: string };

type IngredientRow = {
  key: number;
  display_name?: string;
  amount?: string;
  unit?: string;
  qualifier?: string;
};

let nextRowKey = 0;
function newRow(initial?: Omit<IngredientRow, "key">): IngredientRow {
  return { key: nextRowKey++, ...initial };
}

const fieldClass =
  "rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 outline-none focus:border-orange-400";

export type CocktailFormInitial = {
  name?: string;
  instructions?: string;
  garnish?: string;
  glassware?: string;
  source?: string;
  favorite?: boolean;
  ingredients?: {
    display_name: string;
    amount: number | null;
    unit: string | null;
    qualifier: string | null;
  }[];
  tagIds?: string[];
};

export function CocktailForm({
  action,
  primaryTags,
  styleTags,
  ingredientOptions,
  initial,
  submitLabel = "Save cocktail",
}: {
  action: (formData: FormData) => void;
  primaryTags: Tag[];
  styleTags: Tag[];
  ingredientOptions: string[];
  initial?: CocktailFormInitial;
  submitLabel?: string;
}) {
  // Only the row *count and identity* is client state — each row's text
  // stays an uncontrolled input (seeded via defaultValue), so typing never
  // re-renders the form.
  const [rows, setRows] = useState<IngredientRow[]>(() =>
    initial?.ingredients?.length
      ? initial.ingredients.map((ing) =>
          newRow({
            display_name: ing.display_name,
            amount: ing.amount != null ? String(ing.amount) : "",
            unit: ing.unit ?? "",
            qualifier: ing.qualifier ?? "",
          })
        )
      : [newRow(), newRow(), newRow()]
  );

  const selectedTagIds = new Set(initial?.tagIds ?? []);

  return (
    <form action={action} className="flex flex-col gap-8">
      <label className="flex flex-col gap-1 text-sm text-zinc-300">
        <span>
          Cocktail name <span className="text-orange-400">*</span>
        </span>
        <input
          name="name"
          required
          defaultValue={initial?.name}
          className={fieldClass}
          placeholder="Last Word"
        />
      </label>

      <div>
        <p className="text-sm text-zinc-300">
          Ingredients <span className="text-orange-400">*</span>
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">
          At least one is required. Amount, unit, and note are optional —
          unusual measurements are fine as free text. Matching a suggested
          name links it to the canonical ingredient, which is what powers
          ingredient-on-hand search — typing something else is fine too, it
          just will not be searchable that way yet.
        </p>
        <datalist id="ingredient-options">
          {ingredientOptions.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <div className="mt-3 flex flex-col gap-3">
          {rows.map((row) => (
            <div
              key={row.key}
              className="flex flex-wrap items-center gap-2 rounded-md border border-zinc-800 p-2 sm:border-none sm:p-0"
            >
              <input
                name="ingredient_display_name"
                placeholder="Ingredient (e.g. gin)"
                defaultValue={row.display_name}
                list="ingredient-options"
                className={`${fieldClass} min-w-[9rem] flex-1`}
              />
              <input
                name="ingredient_amount"
                placeholder="2"
                inputMode="decimal"
                defaultValue={row.amount}
                className={`${fieldClass} w-16 shrink-0`}
              />
              <input
                name="ingredient_unit"
                placeholder="oz"
                defaultValue={row.unit}
                className={`${fieldClass} w-16 shrink-0`}
              />
              <input
                name="ingredient_qualifier"
                placeholder="Note (e.g. fresh)"
                defaultValue={row.qualifier}
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
          defaultValue={initial?.instructions}
          className={fieldClass}
          placeholder="Shake with ice, double strain into a coupe."
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm text-zinc-300">
          Garnish
          <input
            name="garnish"
            defaultValue={initial?.garnish}
            className={fieldClass}
            placeholder="Lemon twist"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-300">
          Glassware
          <input
            name="glassware"
            defaultValue={initial?.glassware}
            className={fieldClass}
            placeholder="Coupe"
          />
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
                  defaultChecked={selectedTagIds.has(tag.id)}
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
                  defaultChecked={selectedTagIds.has(tag.id)}
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
          defaultValue={initial?.source}
          className={fieldClass}
          placeholder="e.g. Apple Notes, a book, a bar you loved"
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-zinc-300">
        <input
          type="checkbox"
          name="favorite"
          defaultChecked={initial?.favorite}
          className="accent-orange-500"
        />
        Mark as favorite
      </label>

      <button
        type="submit"
        className="self-start rounded-full bg-orange-500 px-5 py-2 text-sm font-medium text-zinc-950 hover:bg-orange-400"
      >
        {submitLabel}
      </button>
    </form>
  );
}
