import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { classifyIngredientMatch } from "@/lib/ingredient-matching";
import { HaveIngredientsPicker } from "@/components/HaveIngredientsPicker";
import { StylePicker } from "@/components/StylePicker";

type Result = {
  id: string;
  name: string;
  // null when there's no ingredient filter active to classify against
  // (a style-only search) — "make now"/"almost" only means something
  // relative to what you said you have on hand.
  status: "make-now" | "almost" | null;
  matchedCount: number;
  missingNames: string[];
};

// Home / Discover — PRD §7, §6.3: ingredient-on-hand search. "Make now"
// means every canonical-linked ingredient the recipe needs is in the
// have-set; "Almost" names what's missing. Style is a second, independent
// facet (?styles=, own picker/Clear) that can narrow the ingredient
// search or stand alone — "show me Tiki drinks" without picking any
// ingredients at all. Multiple styles are OR'd together; style + haveIds
// together is an intersection (must satisfy both). Featured/related
// recipes are a later pass.
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ have?: string; styles?: string }>;
}) {
  const { have, styles: stylesParam } = await searchParams;
  const supabase = await createClient();

  const [{ data: ingredientRows }, { data: styleTagRows }] = await Promise.all([
    supabase.from("ingredients").select("id, canonical_name").order("canonical_name"),
    supabase.from("tags").select("id, name").eq("type", "style").order("name"),
  ]);
  const ingredients = ingredientRows ?? [];
  const styleTags = styleTagRows ?? [];

  const haveIds = new Set((have ?? "").split(",").filter(Boolean));
  const selectedStyleIds = new Set((stylesParam ?? "").split(",").filter(Boolean));
  let results: Result[] = [];

  // null = no style filter active (don't constrain); a Set = a drink's id
  // must be in it. Computed once, up front, so both the ingredient-match
  // branch and the style-only branch below can apply the same
  // intersection consistently.
  let styleMatchedIds: Set<string> | null = null;
  if (selectedStyleIds.size > 0) {
    const { data: cocktailTagRows } = await supabase
      .from("cocktail_tags")
      .select("cocktail_id")
      .in("tag_id", [...selectedStyleIds]);
    styleMatchedIds = new Set((cocktailTagRows ?? []).map((r) => r.cocktail_id));
  }

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
      .filter(([cocktailId]) => styleMatchedIds === null || styleMatchedIds.has(cocktailId))
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
        .map((m): Result | null => {
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
  } else if (styleMatchedIds !== null) {
    // Style-only search: no ingredient constraint to classify against,
    // just every drink carrying one of the selected styles.
    if (styleMatchedIds.size > 0) {
      const { data: cocktailRows } = await supabase
        .from("cocktails")
        .select("id, name")
        .in("id", [...styleMatchedIds])
        .order("name");

      results = (cocktailRows ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        status: null,
        matchedCount: 0,
        missingNames: [],
      }));
    }
  }

  const hasActiveSearch = haveIds.size > 0 || selectedStyleIds.size > 0;

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
          <HaveIngredientsPicker
            ingredients={ingredients}
            addIngredientHref="/settings/ingredients"
          />
        </Suspense>
      </div>

      {styleTags.length > 0 && (
        <div className="mt-8">
          <Suspense fallback={null}>
            <StylePicker styles={styleTags} />
          </Suspense>
        </div>
      )}

      {hasActiveSearch && (
        <div className="mt-8">
          {results.length === 0 ? (
            <p className="text-sm text-zinc-400">
              No matches yet — try adjusting your ingredients or style, or
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
                    {r.status === "make-now" && (
                      <span className="shrink-0 rounded-full bg-green-500/15 px-2.5 py-1 text-xs font-medium text-green-300">
                        Make now
                      </span>
                    )}
                    {r.status === "almost" && (
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
