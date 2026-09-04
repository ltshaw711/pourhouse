import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { classifyIngredientMatch } from "@/lib/ingredient-matching";
import { HaveIngredientsPicker } from "./HaveIngredientsPicker";

type Result = {
  id: string;
  name: string;
  status: "make-now" | "almost";
  matchedCount: number;
  missingNames: string[];
};

// Home / Discover — PRD §7, §6.3: ingredient-on-hand search. "Make now"
// means every canonical-linked ingredient the recipe needs is in the
// have-set; "Almost" names what's missing. Featured/related recipes are a
// later pass.
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ have?: string }>;
}) {
  const { have } = await searchParams;
  const supabase = await createClient();

  const { data: ingredientRows } = await supabase
    .from("ingredients")
    .select("id, canonical_name")
    .order("canonical_name");
  const ingredients = ingredientRows ?? [];

  const haveIds = new Set((have ?? "").split(",").filter(Boolean));
  let results: Result[] = [];

  if (haveIds.size > 0) {
    const ingredientNameById = new Map(ingredients.map((i) => [i.id, i.canonical_name]));

    // RLS scopes this to the signed-in owner's recipes automatically.
    const { data: recipeRows } = await supabase
      .from("recipe_ingredients")
      .select("cocktail_id, canonical_ingredient_id")
      .not("canonical_ingredient_id", "is", null);

    const requiredByCocktail = new Map<string, Set<string>>();
    for (const row of recipeRows ?? []) {
      if (!row.canonical_ingredient_id) continue;
      const required = requiredByCocktail.get(row.cocktail_id) ?? new Set<string>();
      required.add(row.canonical_ingredient_id);
      requiredByCocktail.set(row.cocktail_id, required);
    }

    const matches = [...requiredByCocktail.entries()]
      .map(([cocktailId, required]) => {
        const match = classifyIngredientMatch(required, haveIds);
        return match ? { cocktailId, ...match } : null;
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);

    if (matches.length > 0) {
      const { data: cocktailRows } = await supabase
        .from("cocktails")
        .select("id, name")
        .in(
          "id",
          matches.map((m) => m.cocktailId)
        );
      const cocktailById = new Map((cocktailRows ?? []).map((c) => [c.id, c]));

      results = matches
        .map((m) => {
          const cocktail = cocktailById.get(m.cocktailId);
          if (!cocktail) return null;
          return {
            id: cocktail.id,
            name: cocktail.name,
            status: m.status,
            matchedCount: m.matchedCount,
            missingNames: m.missingIds.map((id) => ingredientNameById.get(id) ?? "unknown"),
          };
        })
        .filter((r): r is Result => r !== null)
        .sort((a, b) => {
          if (a.status !== b.status) return a.status === "make-now" ? -1 : 1;
          return b.matchedCount - a.matchedCount;
        });
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <p className="text-sm font-medium uppercase tracking-wide text-orange-400">
        Pourhouse
      </p>
      <h1 className="mt-1 text-4xl font-semibold text-zinc-50">
        What can you make?
      </h1>
      <p className="mt-2 max-w-prose text-zinc-400">
        Tap what you have on hand to see what&rsquo;s ready now, and what&rsquo;s
        almost there.
      </p>

      <div className="mt-8">
        <Suspense fallback={null}>
          <HaveIngredientsPicker ingredients={ingredients} />
        </Suspense>
      </div>

      {haveIds.size > 0 && (
        <div className="mt-8">
          {results.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No matches yet — try selecting a few more ingredients, or
              browse the <Link href="/library" className="text-orange-400 hover:underline">full library</Link>.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {results.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/cocktails/${r.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 hover:border-zinc-600"
                  >
                    <span className="font-medium text-zinc-50">{r.name}</span>
                    {r.status === "make-now" ? (
                      <span className="shrink-0 rounded-full bg-green-500/15 px-2.5 py-1 text-xs font-medium text-green-300">
                        Make now
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-400">
                        Almost — missing {r.missingNames.join(", ")}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </main>
  );
}
