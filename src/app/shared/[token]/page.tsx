import { notFound } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { sortByPrimaryIngredient } from "@/lib/cocktail-tags";
import { CocktailCard } from "@/components/CocktailCard";
import { CocktailListRow } from "@/components/CocktailListRow";
import { ViewToggle } from "@/components/ViewToggle";
import { SortControl } from "@/components/SortControl";
import { StylePicker } from "@/components/StylePicker";

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
export default async function SharedLibraryPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ view?: string; sort?: string; styles?: string }>;
}) {
  const { token } = await params;
  const { view: viewParam, sort: sortParam, styles: stylesParam } = await searchParams;
  const view: "grid" | "list" = viewParam === "list" ? "list" : "grid";
  const supabase = await createClient();

  const [{ data: ownerName }, { data: cocktails }, { data: tagRows }] = await Promise.all([
    supabase.rpc("shared_owner_name", { p_token: token }),
    supabase.rpc("shared_cocktails", { p_token: token }),
    supabase.rpc("shared_cocktail_tags", { p_token: token }),
  ]);

  if (!ownerName) notFound();

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

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
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
        {allRows.length > 0 && (
          <div className="flex items-center gap-2">
            <ViewToggle view={view} />
            <SortControl />
          </div>
        )}
      </div>

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
