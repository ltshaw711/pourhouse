import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { gradientFor } from "@/lib/gradient";

// Read-only counterpart to (app)/cocktails/[id] — same layout, no
// favorite/edit/delete controls. A cocktailId that doesn't exist, isn't
// published, or belongs to a different owner than the token resolves to
// all come back as no row from shared_cocktail() — same 404 either way,
// so this route can't be used to probe for the existence of another
// owner's cocktail id.
export default async function SharedCocktailPage({
  params,
}: {
  params: Promise<{ token: string; cocktailId: string }>;
}) {
  const { token, cocktailId } = await params;
  const supabase = await createClient();

  const [{ data: cocktailRows }, { data: ingredientRows }, { data: tagRows }] =
    await Promise.all([
      supabase.rpc("shared_cocktail", { p_token: token, p_cocktail_id: cocktailId }),
      supabase.rpc("shared_cocktail_ingredients", {
        p_token: token,
        p_cocktail_id: cocktailId,
      }),
      supabase.rpc("shared_cocktail_tags", { p_token: token }),
    ]);

  const cocktail = cocktailRows?.[0];
  if (!cocktail) notFound();

  const tags = (tagRows ?? []).filter((t) => t.cocktail_id === cocktailId);
  const primaryTags = tags.filter((t) => t.tag_type === "primary");
  const styleTags = tags.filter((t) => t.tag_type === "style");

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href={`/shared/${token}`} className="text-sm text-zinc-400 hover:text-zinc-300">
        ← Library
      </Link>

      <div
        className={`mt-4 aspect-[3/1] rounded-xl bg-gradient-to-br ${gradientFor(cocktail.id)} ${
          cocktail.photo_url ? "bg-cover bg-center" : ""
        }`}
        style={
          cocktail.photo_url ? { backgroundImage: `url(${cocktail.photo_url})` } : undefined
        }
      />

      <div className="mt-6">
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

      {(primaryTags.length > 0 || styleTags.length > 0) && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {primaryTags.map((t) => (
            <span
              key={t.tag_id}
              className="rounded-full bg-orange-500/15 px-2.5 py-1 text-xs text-orange-300"
            >
              {t.tag_name}
            </span>
          ))}
          {styleTags.map((t) => (
            <span
              key={t.tag_id}
              className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-400"
            >
              {t.tag_name}
            </span>
          ))}
        </div>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-400">
          Ingredients
        </h2>
        <ul className="mt-3 flex flex-col gap-1.5">
          {(ingredientRows ?? []).map((ing) => (
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
    </main>
  );
}
