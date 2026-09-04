import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTagsByCocktail } from "@/lib/cocktail-tags";
import { CocktailCard } from "@/components/CocktailCard";

// Library — PRD §7 / §6.2: browse the complete collection.
// Grid view only for now; list view and filters follow once there's a
// collection large enough to need them.
export default async function LibraryPage() {
  const supabase = await createClient();

  const { data: cocktails } = await supabase
    .from("cocktails")
    .select("id, name, photo_url")
    .order("created_at", { ascending: false });

  const rows = cocktails ?? [];
  const tagsByCocktail = await getTagsByCocktail(
    supabase,
    rows.map((c) => c.id)
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-zinc-50">Library</h1>
        <Link
          href="/cocktails/new"
          className="rounded-full bg-orange-500 px-4 py-1.5 text-sm font-medium text-zinc-950 hover:bg-orange-400"
        >
          Add cocktail
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <p className="text-lg text-zinc-300">Your collection is empty.</p>
          <p className="max-w-sm text-sm text-zinc-500">
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
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {rows.map((cocktail) => {
            const tags = tagsByCocktail[cocktail.id] ?? [];
            return (
              <CocktailCard
                key={cocktail.id}
                id={cocktail.id}
                name={cocktail.name}
                photoUrl={cocktail.photo_url}
                primaryTags={tags.filter((t) => t.type === "primary")}
                styleTags={tags.filter((t) => t.type === "style")}
              />
            );
          })}
        </div>
      )}
    </main>
  );
}
