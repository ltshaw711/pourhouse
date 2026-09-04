import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getFormTags, getTagsByCocktail } from "@/lib/cocktail-tags";
import { getIngredientOptions } from "@/lib/ingredient-matching";
import { updateCocktail } from "../../actions";
import { CocktailForm } from "@/components/CocktailForm";

// Edit cocktail — PRD §6.2 / §6.5. Validation errors render inside
// CocktailForm itself via useActionState.
export default async function EditCocktailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const [{ primaryTags, styleTags }, tagsByCocktail, ingredientOptions] = await Promise.all([
    getFormTags(supabase),
    getTagsByCocktail(supabase, [id]),
    getIngredientOptions(supabase),
  ]);

  const updateThisCocktail = updateCocktail.bind(null, cocktail.id);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-semibold text-zinc-50">Edit cocktail</h1>

      <div className="mt-8">
        <CocktailForm
          action={updateThisCocktail}
          primaryTags={primaryTags}
          styleTags={styleTags}
          ingredientOptions={ingredientOptions}
          submitLabel="Save changes"
          initial={{
            name: cocktail.name,
            instructions: cocktail.instructions ?? undefined,
            garnish: cocktail.garnish ?? undefined,
            glassware: cocktail.glassware ?? undefined,
            source: cocktail.source ?? undefined,
            favorite: cocktail.favorite,
            photo_url: cocktail.photo_url,
            ingredients: ingredients ?? [],
            tagIds: (tagsByCocktail[id] ?? []).map((t) => t.id),
          }}
        />
      </div>
    </main>
  );
}
