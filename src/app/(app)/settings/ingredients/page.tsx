import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { deleteIngredient } from "./actions";
import { DeleteIngredientButton } from "./DeleteIngredientButton";

// Ingredient management — the canonical list that drives the Home page's
// "What can you make?" chips and the add/edit form's ingredient
// autocomplete/linking.
export default async function IngredientsPage() {
  const supabase = await createClient();
  const { data: ingredients } = await supabase
    .from("ingredients")
    .select("id, canonical_name, category, aliases")
    .order("canonical_name");

  const rows = ingredients ?? [];

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/settings" className="text-sm text-zinc-400 hover:text-zinc-300">
        ← Settings
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold text-zinc-50">Ingredients</h1>
        <Link
          href="/settings/ingredients/new"
          className="rounded-full bg-orange-500 px-4 py-1.5 text-sm font-medium text-zinc-950 hover:bg-orange-400"
        >
          Add ingredient
        </Link>
      </div>
      <p className="mt-2 max-w-prose text-sm text-zinc-400">
        This is the canonical list shown on the &ldquo;What can you
        make?&rdquo; page and suggested while adding a recipe&rsquo;s
        ingredients. An exact match on the name or an alias is what links a
        recipe line to one of these.
      </p>

      {rows.length === 0 ? (
        <p className="mt-10 text-zinc-300">No ingredients yet.</p>
      ) : (
        <ul className="mt-8 flex flex-col gap-2">
          {rows.map((ingredient) => (
            <li
              key={ingredient.id}
              className="flex items-center justify-between gap-3 rounded-md border border-zinc-800 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-zinc-100">{ingredient.canonical_name}</p>
                {(ingredient.category || ingredient.aliases.length > 0) && (
                  <p className="mt-0.5 truncate text-xs text-zinc-400">
                    {ingredient.category}
                    {ingredient.category && ingredient.aliases.length > 0 && " · "}
                    {ingredient.aliases.length > 0 &&
                      `aliases: ${ingredient.aliases.join(", ")}`}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Link
                  href={`/settings/ingredients/${ingredient.id}/edit`}
                  className="text-sm text-zinc-400 hover:text-zinc-200"
                >
                  Edit
                </Link>
                <DeleteIngredientButton
                  action={deleteIngredient.bind(null, ingredient.id)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
