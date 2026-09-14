import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CocktailCard } from "@/components/CocktailCard";
import { CocktailListRow } from "@/components/CocktailListRow";
import { ViewToggle } from "@/components/ViewToggle";
import { SortControl } from "@/components/SortControl";

// Public read-only library — no session, no RLS-visible table access.
// Everything comes through SECURITY DEFINER functions
// (supabase/migrations/0005_public_share.sql) that resolve the token to
// an owner themselves; an invalid or revoked token resolves to no owner
// name at all, which reads as a 404 rather than an empty library.
//
// View and sort mirror the authenticated Library page (same
// ViewToggle/SortControl components, same ?view=/?sort= params) so a
// read-only visitor gets the same browsing controls a signed-in owner
// has. shared_cocktails() always returns newest-first; name sorting is
// done here in JS on the already-fetched (unpaginated) list rather than
// adding another DB round trip or RPC parameter for it.
export default async function SharedLibraryPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ view?: string; sort?: string }>;
}) {
  const { token } = await params;
  const { view: viewParam, sort: sortParam } = await searchParams;
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

  let rows = cocktails ?? [];
  if (sortParam === "name-asc" || sortParam === "name-desc") {
    const sorted = [...rows].sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );
    rows = sortParam === "name-desc" ? sorted.reverse() : sorted;
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
        {rows.length > 0 && (
          <div className="flex items-center gap-2">
            <ViewToggle view={view} />
            <SortControl />
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="mt-16 text-center text-zinc-400">
          Nothing published yet.
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
