import { createClient } from "@/lib/supabase/server";
import { getFormTags } from "@/lib/cocktail-tags";
import { getIngredientOptions } from "@/lib/ingredient-matching";
import { createCocktail } from "../actions";
import { CocktailForm } from "@/components/CocktailForm";

// Add cocktail — PRD §6.5. Validation errors and duplicate warnings
// (§6.2) render inside CocktailForm itself via useActionState.
export default async function NewCocktailPage() {
  const supabase = await createClient();
  const [{ primaryTags, styleTags }, ingredientOptions] = await Promise.all([
    getFormTags(supabase),
    getIngredientOptions(supabase),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-semibold text-zinc-50">Add cocktail</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Required: name and at least one ingredient line.
      </p>

      <div className="mt-8">
        <CocktailForm
          action={createCocktail}
          primaryTags={primaryTags}
          styleTags={styleTags}
          ingredientOptions={ingredientOptions}
        />
      </div>
    </main>
  );
}
