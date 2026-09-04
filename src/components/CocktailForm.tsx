"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { CocktailActionState } from "@/lib/duplicate-detection";
import type { CocktailFormValues } from "@/lib/cocktail-form-values";

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
  "rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/40";

type CocktailFormAction = (
  state: CocktailActionState,
  formData: FormData
) => CocktailActionState | Promise<CocktailActionState>;

export function CocktailForm({
  action,
  primaryTags,
  styleTags,
  ingredientOptions,
  initial,
  submitLabel = "Save cocktail",
}: {
  action: CocktailFormAction;
  primaryTags: Tag[];
  styleTags: Tag[];
  ingredientOptions: string[];
  initial?: CocktailFormValues;
  submitLabel?: string;
}) {
  // useActionState (not a plain <form action={action}>) so a validation
  // error or duplicate warning renders in place rather than via redirect.
  const [state, formAction, isPending] = useActionState(action, null);

  // Next.js refreshes the route's Server Components after a Server Action
  // completes, even without redirect() — and that refresh can reset this
  // form's uncontrolled inputs. So instead of trusting the DOM to have
  // preserved what the user typed, the action hands the submission back as
  // `state.values`, and CocktailFormFields below gets remounted (via key)
  // to pick it up fresh whenever a new result arrives. This is React's
  // documented "adjust state during render" pattern, not an effect — no
  // extra render or flicker.
  const [prevState, setPrevState] = useState(state);
  const [formInstance, setFormInstance] = useState(0);
  if (state !== prevState) {
    setPrevState(state);
    setFormInstance((n) => n + 1);
  }

  // A merge, not a full replace: state.values never carries photo_url (a
  // File can't round-trip through server state, and the stored photo
  // hasn't changed just because this submission failed), so a plain `??`
  // here would make the photo preview vanish after any validation error
  // or duplicate warning even though nothing about the photo changed.
  const effectiveInitial = state?.values ? { ...initial, ...state.values } : initial;

  return (
    <form action={formAction} className="flex flex-col gap-8">
      {state?.error && (
        <p className="rounded-md border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}

      {state?.duplicates && state.duplicates.length > 0 && (
        <div className="flex flex-col gap-3 rounded-md border border-orange-900 bg-orange-950 px-4 py-3 text-sm text-orange-200">
          <p className="font-medium">
            This looks similar to {state.duplicates.length === 1 ? "a cocktail" : "cocktails"}{" "}
            already in your library:
          </p>
          <ul className="flex flex-col gap-1">
            {state.duplicates.map((dup) => (
              <li key={dup.id} className="flex items-center justify-between gap-3">
                <span>
                  {dup.name}{" "}
                  <span className="text-orange-400">
                    ({dup.matchedIngredients}/{dup.totalIngredients} ingredients match)
                  </span>
                </span>
                <Link
                  href={`/cocktails/${dup.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-orange-300 underline hover:text-orange-200"
                >
                  View
                </Link>
              </li>
            ))}
          </ul>
          <p className="text-orange-300/80">
            Change the name or ingredients above to treat this as a different
            recipe, or save it anyway to keep both.
          </p>
        </div>
      )}

      <CocktailFormFields
        key={formInstance}
        initial={effectiveInitial}
        primaryTags={primaryTags}
        styleTags={styleTags}
        ingredientOptions={ingredientOptions}
      />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="self-start rounded-full bg-orange-500 px-5 py-2 text-sm font-medium text-zinc-950 hover:bg-orange-400 disabled:opacity-60"
        >
          {isPending ? "Saving…" : submitLabel}
        </button>
        {state?.duplicates && state.duplicates.length > 0 && (
          // A submit button's own name/value is only included in the
          // FormData when *that* button is what triggered the submit —
          // no extra client state needed to distinguish the two actions.
          <button
            type="submit"
            name="confirm_duplicate"
            value="true"
            disabled={isPending}
            className="self-start rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-500 disabled:opacity-60"
          >
            Save anyway
          </button>
        )}
      </div>
    </form>
  );
}

// Owns the ingredient-row list and every uncontrolled field. Remounted
// (via key, from the parent) whenever the form needs to reset to a fresh
// set of values instead of what's currently in the DOM.
function CocktailFormFields({
  initial,
  primaryTags,
  styleTags,
  ingredientOptions,
}: {
  initial?: CocktailFormValues;
  primaryTags: Tag[];
  styleTags: Tag[];
  ingredientOptions: string[];
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
    <>
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
        <p className="mt-0.5 text-xs text-zinc-400">
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
                className="shrink-0 rounded-md px-2 py-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
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
                className="flex cursor-pointer items-center gap-1.5 rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200 has-[:checked]:border-orange-400 has-[:checked]:text-orange-300 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-orange-400 has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-zinc-950"
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
                className="flex cursor-pointer items-center gap-1.5 rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200 has-[:checked]:border-orange-400 has-[:checked]:text-orange-300 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-orange-400 has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-zinc-950"
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

      <div className="flex flex-col gap-2">
        <p className="text-sm text-zinc-300">Photo</p>
        {initial?.photo_url && (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- a
                plain CSS background-image is used everywhere else photos
                render (cards, detail hero); no next/image config exists
                for the Storage domain, and this is a small fixed preview. */}
            <img
              src={initial.photo_url}
              alt=""
              className="h-16 w-16 rounded-md object-cover"
            />
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-400">
              <input
                type="checkbox"
                name="remove_photo"
                value="true"
                className="h-4 w-4 accent-red-500"
              />
              Remove photo
            </label>
          </div>
        )}
        <input
          type="file"
          name="photo"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="text-sm text-zinc-300 file:mr-3 file:rounded-full file:border-0 file:bg-zinc-800 file:px-3 file:py-1.5 file:text-sm file:text-zinc-200 hover:file:bg-zinc-700"
        />
        <p className="text-xs text-zinc-400">JPEG, PNG, WebP, or GIF — up to 5MB.</p>
      </div>

      <label className="flex cursor-pointer items-center gap-2 py-2 text-sm text-zinc-300">
        <input
          type="checkbox"
          name="favorite"
          defaultChecked={initial?.favorite}
          className="h-4 w-4 accent-orange-500"
        />
        Mark as favorite
      </label>
    </>
  );
}
