import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getTagsByCocktail, getFormTags, sortByPrimaryIngredient } from "@/lib/cocktail-tags";
import { VIEW_COOKIE, SORT_COOKIE, isLibraryView, isLibrarySort } from "@/lib/library-prefs";
import { CocktailCard } from "@/components/CocktailCard";
import { CocktailListRow } from "@/components/CocktailListRow";
import { LibraryFilters } from "./LibraryFilters";
import { SurpriseMeButton } from "./SurpriseMeButton";
import { ViewToggle } from "@/components/ViewToggle";

type CocktailRow = { id: string; name: string; photo_url: string | null };

// Library — PRD §7 / §6.2 / §6.3: browse, search by name, filter by tag
// and favorites, plus "Surprise me" from the current filtered set.
// Ingredient-on-hand search ("make now" / "almost") lives on the Home
// page instead — see src/app/(app)/page.tsx.
export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    tags?: string;
    favorite?: string;
    view?: string;
    sort?: string;
  }>;
}) {
  const { q, tags, favorite, view: viewParam, sort: sortParam } = await searchParams;

  // A URL with no explicit view/sort could mean "never chosen" or could
  // mean "arrived via a plain link" (the nav bar's "Library", a fresh
  // sign-in redirect) — the visitor's last choice, ViewToggle/
  // SortControl already wrote it to a cookie, so fall back to that
  // before defaulting to grid/newest. Redirecting once here, before any
  // data fetch or render, means no flash of the wrong view first; once
  // redirected the URL carries the param, so this doesn't loop.
  if (viewParam === undefined || sortParam === undefined) {
    const cookieStore = await cookies();
    const cookieView = cookieStore.get(VIEW_COOKIE)?.value;
    const cookieSort = cookieStore.get(SORT_COOKIE)?.value;
    const fallbackView = viewParam === undefined && isLibraryView(cookieView) ? cookieView : undefined;
    const fallbackSort = sortParam === undefined && isLibrarySort(cookieSort) ? cookieSort : undefined;

    if (fallbackView || fallbackSort) {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (tags) params.set("tags", tags);
      if (favorite) params.set("favorite", favorite);
      params.set("view", fallbackView ?? viewParam ?? "grid");
      params.set("sort", fallbackSort ?? sortParam ?? "newest");
      redirect(`/library?${params.toString()}`);
    }
  }

  const view: "grid" | "list" = viewParam === "list" ? "list" : "grid";
  const supabase = await createClient();

  const selectedTagIds = tags ? tags.split(",").filter(Boolean) : [];

  let cocktailQuery = supabase.from("cocktails").select("id, name, photo_url");

  // normalized_name (lowercased/trimmed) rather than name, so A-Z/Z-A
  // sorting is consistent regardless of capitalization.
  if (sortParam === "name-asc") {
    cocktailQuery = cocktailQuery.order("normalized_name", { ascending: true });
  } else if (sortParam === "name-desc") {
    cocktailQuery = cocktailQuery.order("normalized_name", { ascending: false });
  } else {
    cocktailQuery = cocktailQuery.order("created_at", { ascending: false });
  }

  if (q?.trim()) {
    cocktailQuery = cocktailQuery.ilike("name", `%${q.trim()}%`);
  }
  if (favorite === "true") {
    cocktailQuery = cocktailQuery.eq("favorite", true);
  }

  let rows: CocktailRow[] = [];

  if (selectedTagIds.length > 0) {
    // Cocktails matching ANY selected tag (OR across the whole chip set) —
    // simplest useful behavior for a first pass at tag filtering.
    const { data: matches } = await supabase
      .from("cocktail_tags")
      .select("cocktail_id")
      .in("tag_id", selectedTagIds);
    const matchingIds = [...new Set((matches ?? []).map((r) => r.cocktail_id))];

    if (matchingIds.length > 0) {
      const { data } = await cocktailQuery.in("id", matchingIds);
      rows = data ?? [];
    }
  } else {
    const { data } = await cocktailQuery;
    rows = data ?? [];
  }

  const tagsByCocktail = await getTagsByCocktail(
    supabase,
    rows.map((c) => c.id)
  );
  const { primaryTags, styleTags } = await getFormTags(supabase);

  // Primary-tag sort needs the tag lookup above first — it's not a plain
  // column the DB query can ORDER BY directly.
  if (sortParam === "primary") {
    rows = sortByPrimaryIngredient(rows, tagsByCocktail);
  }

  const hasActiveFilters = Boolean(q?.trim() || selectedTagIds.length > 0 || favorite === "true");
  // Distinguish "you have nothing yet" from "nothing matches these filters"
  // — checked separately so the empty state doesn't need its own query.
  const collectionIsEmpty = !hasActiveFilters && rows.length === 0;

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold text-zinc-50">Library</h1>
        <div className="flex items-center gap-2">
          {!collectionIsEmpty && <ViewToggle view={view} />}
          <SurpriseMeButton cocktailIds={rows.map((c) => c.id)} />
          <Link
            href="/cocktails/new"
            className="rounded-full bg-orange-500 px-4 py-1.5 text-sm font-medium text-zinc-950 hover:bg-orange-400"
          >
            Add cocktail
          </Link>
        </div>
      </div>

      {!collectionIsEmpty && (
        <div className="mt-6">
          <Suspense fallback={null}>
            <LibraryFilters primaryTags={primaryTags} styleTags={styleTags} />
          </Suspense>
        </div>
      )}

      {collectionIsEmpty ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <p className="text-lg text-zinc-300">Your collection is empty.</p>
          <p className="max-w-sm text-sm text-zinc-400">
            Add your first cocktail to start building your library, or
            import an existing Apple Notes folder once imports are live.
          </p>
          <Link
            href="/cocktails/new"
            className="mt-2 rounded-full bg-orange-500 px-5 py-2 text-sm font-medium text-zinc-950 hover:bg-orange-400"
          >
            Add your first cocktail
          </Link>
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-2 text-center">
          <p className="text-lg text-zinc-300">No cocktails match these filters.</p>
          <p className="text-sm text-zinc-400">
            Try a different search or clear filters to see everything.
          </p>
        </div>
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
              />
            );
          })}
        </div>
      )}
    </main>
  );
}
