import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { sortByPrimaryIngredient } from "@/lib/cocktail-tags";
import { rankIngredientMatches } from "@/lib/ingredient-matching";
import { HaveIngredientsPicker } from "@/components/HaveIngredientsPicker";
import { CocktailCard } from "@/components/CocktailCard";
import { CocktailListRow } from "@/components/CocktailListRow";
import { ViewToggle } from "@/components/ViewToggle";
import { SortControl } from "@/components/SortControl";
import { StylePicker } from "@/components/StylePicker";
import { RememberLibraryVisit } from "@/components/RememberLibraryVisit";

// Public read-only library — no session, no RLS-visible table access.
// Everything comes through SECURITY DEFINER functions
// (supabase/migrations/0005_public_share.sql) that resolve the token to
// an owner themselves; an invalid or revoked token resolves to no owner
// name at all, which reads as a 404 rather than an empty library.
//
// View and sort mirror the authenticated Library page (same
// ViewToggle/SortControl components, same ?view=/?sort= params) so a
// read-only visitor gets the same browsing controls a signed-in owner
// has. shared_cocktails() always returns newest-first; name and
// primary-ingredient sorting are both done here in JS on the
// already-fetched (unpaginated) list rather than adding another DB
// round trip or RPC parameter for either.
//
// Style filtering (?styles=, same StylePicker as the signed-in Home
// page, ANY-match across the selected styles) works the same way: the
// chip list is derived from the tag rows already returned by
// shared_cocktail_tags (so it only offers styles at least one published
// cocktail actually carries — no dead chips for a read-only visitor) and
// the filter is applied in JS, so no new database function is needed.
//
// "What do you have on hand?" (?have=, same HaveIngredientsPicker as
// Home) is the one part that does need two more token-scoped functions
// (0008_shared_ingredient_search.sql): recipe ingredients aren't
// otherwise readable by a visitor. With any ingredient picked the page
// switches from the library grid to Home-style Make now / Almost
// results (view and sort don't apply to a ranked list, so those
// controls hide); the style chips stay and intersect with it, exactly
// as on Home. If the migration isn't applied the ingredient list comes
// back empty and the picker simply doesn't render.
export default async function SharedLibraryPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ view?: string; sort?: string; styles?: string; have?: string }>;
}) {
  const { token } = await params;
  const {
    view: viewParam,
    sort: sortParam,
    styles: stylesParam,
    have: haveParam,
  } = await searchParams;
  const view: "grid" | "list" = viewParam === "list" ? "list" : "grid";
  const supabase = await createClient();

  const [
    { data: ownerName },
    { data: cocktails },
    { data: tagRows },
    { data: ingredientRows },
  ] = await Promise.all([
    supabase.rpc("shared_owner_name", { p_token: token }),
    supabase.rpc("shared_cocktails", { p_token: token }),
    supabase.rpc("shared_cocktail_tags", { p_token: token }),
    supabase.rpc("shared_ingredients", { p_token: token }),
  ]);

  if (!ownerName) notFound();

  const ingredients = ingredientRows ?? [];

  const tagsByCocktail: Record<
    string,
    { id: string; name: string; type: string }[]
  > = {};
  for (const row of tagRows ?? []) {
    (tagsByCocktail[row.cocktail_id] ??= []).push({
      id: row.tag_id,
      name: row.tag_name,
      type: row.tag_type,
    });
  }

  const styleNameById = new Map<string, string>();
  for (const row of tagRows ?? []) {
    if (row.tag_type === "style") styleNameById.set(row.tag_id, row.tag_name);
  }
  const styleTags = [...styleNameById.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const selectedStyleIds = new Set((stylesParam ?? "").split(",").filter(Boolean));

  const allRows = cocktails ?? [];
  let rows =
    selectedStyleIds.size === 0
      ? allRows
      : allRows.filter((c) =>
          (tagsByCocktail[c.id] ?? []).some(
            (t) => t.type === "style" && selectedStyleIds.has(t.id)
          )
        );

  if (sortParam === "name-asc" || sortParam === "name-desc") {
    const sorted = [...rows].sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );
    rows = sortParam === "name-desc" ? sorted.reverse() : sorted;
  } else if (sortParam === "primary") {
    rows = sortByPrimaryIngredient(rows, tagsByCocktail);
  }

  // Ingredient mode: any picked ingredient (and a picker that actually
  // loaded) turns the page into ranked Make now / Almost results.
  const haveIds = new Set((haveParam ?? "").split(",").filter(Boolean));
  const ingredientMode = haveIds.size > 0 && ingredients.length > 0;

  let ingredientResults: ReturnType<typeof rankIngredientMatches> = [];
  if (ingredientMode) {
    const { data: requirementRows } = await supabase.rpc("shared_recipe_requirements", {
      p_token: token,
    });
    ingredientResults = rankIngredientMatches({
      requirements: requirementRows ?? [],
      haveIds,
      cocktailNameById: new Map(allRows.map((c) => [c.id, c.name])),
      ingredientNameById: new Map(ingredients.map((i) => [i.id, i.canonical_name])),
      // Same intersection rule as Home: with a style filter active a
      // drink must carry one of the selected styles to be a result.
      allowedCocktailIds:
        selectedStyleIds.size > 0 ? new Set(rows.map((c) => c.id)) : null,
    });
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <RememberLibraryVisit storageKey={`pourhouse:visited-shared-library:${token}`} />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-orange-400">
            Pourhouse
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-zinc-50">
            {ownerName}&rsquo;s cocktail library
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Read-only — shared via a public link.
          </p>
        </div>
        {allRows.length > 0 && !ingredientMode && (
          <div className="flex items-center gap-2">
            <ViewToggle view={view} />
            <SortControl />
          </div>
        )}
      </div>

      {allRows.length > 0 && ingredients.length > 0 && (
        <div className="mt-6">
          <Suspense fallback={null}>
            <HaveIngredientsPicker ingredients={ingredients} />
          </Suspense>
        </div>
      )}

      {allRows.length > 0 && styleTags.length > 0 && (
        <div className="mt-6">
          <Suspense fallback={null}>
            <StylePicker styles={styleTags} />
          </Suspense>
        </div>
      )}

      {allRows.length === 0 ? (
        <p className="mt-16 text-center text-zinc-400">
          Nothing published yet.
        </p>
      ) : ingredientMode ? (
        ingredientResults.length === 0 ? (
          <p className="mt-8 text-sm text-zinc-400">
            No matches yet — try adjusting your ingredients or style, or{" "}
            <Link href={`/shared/${token}`} className="text-orange-400 hover:underline">
              browse the full library
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-8 flex flex-col gap-3">
            {ingredientResults.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/shared/${token}/${r.id}`}
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
        )
      ) : rows.length === 0 ? (
        <p className="mt-16 text-center text-zinc-400">
          No drinks match the selected style — clear it to see everything.
        </p>
      ) : view === "list" ? (
        <div className="mt-8 flex flex-col gap-2">
          {rows.map((cocktail) => {
            const cocktailTags = tagsByCocktail[cocktail.id] ?? [];
            return (
              <CocktailListRow
                key={cocktail.id}
                id={cocktail.id}
                name={cocktail.name}
                photoUrl={cocktail.photo_url}
                primaryTags={cocktailTags.filter((t) => t.type === "primary")}
                styleTags={cocktailTags.filter((t) => t.type === "style")}
                hrefBase={`/shared/${token}`}
              />
            );
          })}
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {rows.map((cocktail) => {
            const cocktailTags = tagsByCocktail[cocktail.id] ?? [];
            return (
              <CocktailCard
                key={cocktail.id}
                id={cocktail.id}
                name={cocktail.name}
                photoUrl={cocktail.photo_url}
                primaryTags={cocktailTags.filter((t) => t.type === "primary")}
                styleTags={cocktailTags.filter((t) => t.type === "style")}
                hrefBase={`/shared/${token}`}
              />
            );
          })}
        </div>
      )}
    </main>
  );
}
