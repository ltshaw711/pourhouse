import { createClient } from "@/lib/supabase/server";
import { createCocktail } from "../actions";
import { CocktailForm } from "./CocktailForm";

// Add cocktail — PRD §6.5
export default async function NewCocktailPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: tags } = await supabase
    .from("tags")
    .select("id, name, type")
    .in("type", ["primary", "style"])
    .order("name");

  const primaryTags = (tags ?? []).filter((t) => t.type === "primary");
  const styleTags = (tags ?? []).filter((t) => t.type === "style");

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-semibold text-zinc-50">Add cocktail</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Required: name and at least one ingredient line.
      </p>

      {error && (
        <p className="mt-4 rounded-md border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="mt-8">
        <CocktailForm
          action={createCocktail}
          primaryTags={primaryTags}
          styleTags={styleTags}
        />
      </div>
    </main>
  );
}
