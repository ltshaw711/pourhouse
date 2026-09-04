import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getFormTags, getTagsByCocktail } from "@/lib/cocktail-tags";
import { updateCocktail } from "../../actions";
import { CocktailForm } from "@/components/CocktailForm";

// Edit cocktail — PRD §6.2 / §6.5
export default async function EditCocktailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

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

  const [{ primaryTags, styleTags }, tagsByCocktail] = await Promise.all([
    getFormTags(supabase),
    getTagsByCocktail(supabase, [id]),
  ]);

  const updateThisCocktail = updateCocktail.bind(null, cocktail.id);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-semibold text-zinc-50">Edit cocktail</h1>

      {error && (
        <p className="mt-4 rounded-md border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="mt-8">
        <CocktailForm
          action={updateThisCocktail}
          primaryTags={primaryTags}
          styleTags={styleTags}
          submitLabel="Save changes"
          initial={{
            name: cocktail.name,
            instructions: cocktail.instructions ?? undefined,
            garnish: cocktail.garnish ?? undefined,
            glassware: cocktail.glassware ?? undefined,
            source: cocktail.source ?? undefined,
            favorite: cocktail.favorite,
            ingredients: ingredients ?? [],
            tagIds: (tagsByCocktail[id] ?? []).map((t) => t.id),
          }}
        />
      </div>
    </main>
  );
}
