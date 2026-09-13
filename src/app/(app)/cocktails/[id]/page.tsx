import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getTagsByCocktail,
  getRelatedCocktailIds,
  type CocktailTag,
} from "@/lib/cocktail-tags";
import { gradientFor } from "@/lib/gradient";
import { deleteCocktail, setFavorite } from "../actions";
import { DeleteCocktailButton } from "./DeleteCocktailButton";
import { BackToLibraryLink } from "./BackToLibraryLink";
import { CocktailCard } from "@/components/CocktailCard";

// Cocktail detail — PRD §7 / §6.2
export default async function CocktailDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  // RLS scopes this to the signed-in owner automatically — a cocktail id
  // that exists but belongs to someone else comes back as no row, same as
  // one that doesn't exist at all.
  const { data: cocktail } = await supabase
    .from("cocktails")
    .select("*")
    .eq("id", id)
    .single();

  if (!cocktail) notFound();

  const { data: ingredients } = await supabase
    .from("recipe_ingredients")
    .select("*")
    .eq("cocktail_id", id)
    .order("position");

  const tagsByCocktail = await getTagsByCocktail(supabase, [id]);
  const tags = tagsByCocktail[id] ?? [];
  const primaryTags = tags.filter((t) => t.type === "primary");
  const styleTags = tags.filter((t) => t.type === "style");

  const deleteThisCocktail = deleteCocktail.bind(null, cocktail.id);
  const toggleFavorite = setFavorite.bind(null, cocktail.id, !cocktail.favorite);

  const relatedIds = await getRelatedCocktailIds(
    supabase,
    id,
    tags.map((t) => t.id)
  );

  let relatedCocktails: { id: string; name: string; photo_url: string | null }[] = [];
  let tagsForRelated: Record<string, CocktailTag[]> = {};

  if (relatedIds.length > 0) {
    const [{ data: relatedRows }, relatedTagsByCocktail] = await Promise.all([
      supabase.from("cocktails").select("id, name, photo_url").in("id", relatedIds),
      getTagsByCocktail(supabase, relatedIds),
    ]);
    // Preserve the relevance order from getRelatedCocktailIds — the .in()
    // query above doesn't guarantee it.
    const byId = new Map((relatedRows ?? []).map((c) => [c.id, c]));
    relatedCocktails = relatedIds.map((rid) => byId.get(rid)).filter((c) => c != null);
    tagsForRelated = relatedTagsByCocktail;
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <BackToLibraryLink />

      {error && (
        <p className="mt-4 rounded-md border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <div
        className={`mt-4 aspect-[3/1] rounded-xl bg-gradient-to-br ${gradientFor(cocktail.id)} ${
          cocktail.photo_url ? "bg-cover bg-center" : ""
        }`}
        style={
          cocktail.photo_url ? { backgroundImage: `url(${cocktail.photo_url})` } : undefined
        }
      />

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-zinc-50">
            {cocktail.name}
            {cocktail.favorite && (
              <span className="ml-2 text-orange-400" title="Favorite">
                ★
              </span>
            )}
          </h1>
          {cocktail.description && (
            <p className="mt-2 text-zinc-400">{cocktail.description}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form action={toggleFavorite}>
            <button
              type="submit"
              aria-pressed={cocktail.favorite}
              title={cocktail.favorite ? "Remove from favorites" : "Add to favorites"}
              className="rounded-full border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 hover:border-zinc-500"
            >
              {cocktail.favorite ? "★ Favorited" : "☆ Favorite"}
            </button>
          </form>
          <Link
            href={`/cocktails/${cocktail.id}/edit`}
            className="rounded-full border border-zinc-700 px-4 py-1.5 text-sm text-zinc-200 hover:border-zinc-500"
          >
            Edit
          </Link>
          <DeleteCocktailButton action={deleteThisCocktail} />
        </div>
      </div>

      {(primaryTags.length > 0 || styleTags.length > 0) && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {primaryTags.map((t) => (
            <span
              key={t.id}
              className="rounded-full bg-orange-500/15 px-2.5 py-1 text-xs text-orange-300"
            >
              {t.name}
            </span>
          ))}
          {styleTags.map((t) => (
            <span
              key={t.id}
              className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-400"
            >
              {t.name}
            </span>
          ))}
        </div>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-400">
          Ingredients
        </h2>
        <ul className="mt-3 flex flex-col gap-1.5">
          {(ingredients ?? []).map((ing) => (
            <li key={ing.id} className="text-zinc-200">
              {[
                ing.amount != null ? String(ing.amount) : null,
                ing.unit,
                ing.display_name,
                ing.qualifier ? `(${ing.qualifier})` : null,
              ]
                .filter(Boolean)
                .join(" ")}
            </li>
          ))}
        </ul>
      </section>

      {cocktail.instructions && (
        <section className="mt-8">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-400">
            Instructions
          </h2>
          <p className="mt-3 whitespace-pre-wrap text-zinc-200">
            {cocktail.instructions}
          </p>
        </section>
      )}

      <dl className="mt-8 grid grid-cols-2 gap-4 text-sm">
        {cocktail.garnish && (
          <div>
            <dt className="text-zinc-400">Garnish</dt>
            <dd className="text-zinc-200">{cocktail.garnish}</dd>
          </div>
        )}
        {cocktail.glassware && (
          <div>
            <dt className="text-zinc-400">Glassware</dt>
            <dd className="text-zinc-200">{cocktail.glassware}</dd>
          </div>
        )}
        {cocktail.source && (
          <div>
            <dt className="text-zinc-400">Source</dt>
            <dd className="text-zinc-200">{cocktail.source}</dd>
          </div>
        )}
      </dl>

      {relatedCocktails.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-400">
            Related
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {relatedCocktails.map((related) => {
              const relatedTags = tagsForRelated[related.id] ?? [];
              return (
                <CocktailCard
                  key={related.id}
                  id={related.id}
                  name={related.name}
                  photoUrl={related.photo_url}
                  primaryTags={relatedTags.filter((t) => t.type === "primary")}
                  styleTags={relatedTags.filter((t) => t.type === "style")}
                />
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
