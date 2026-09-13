import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CocktailCard } from "@/components/CocktailCard";

// Public read-only library — no session, no RLS-visible table access.
// Everything comes through SECURITY DEFINER functions
// (supabase/migrations/0005_public_share.sql) that resolve the token to
// an owner themselves; an invalid or revoked token resolves to no owner
// name at all, which reads as a 404 rather than an empty library.
export default async function SharedLibraryPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
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

  const rows = cocktails ?? [];

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <p className="text-sm font-medium uppercase tracking-wide text-orange-400">
        Pourhouse
      </p>
      <h1 className="mt-1 text-3xl font-semibold text-zinc-50">
        {ownerName}&rsquo;s cocktail library
      </h1>
      <p className="mt-2 text-sm text-zinc-400">
        Read-only — shared via a public link.
      </p>

      {rows.length === 0 ? (
        <p className="mt-16 text-center text-zinc-400">
          Nothing published yet.
        </p>
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
