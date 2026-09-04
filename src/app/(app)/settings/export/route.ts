import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTagsByCocktail } from "@/lib/cocktail-tags";
import type { Database } from "@/types/database";

// PRD §11: data export (JSON). Auth is already enforced by proxy.ts for
// every non-public route, but the explicit check below is cheap insurance
// against relying on that alone.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { data: cocktails } = await supabase
    .from("cocktails")
    .select("*")
    .order("created_at", { ascending: true });

  const rows = cocktails ?? [];
  const ids = rows.map((c) => c.id);

  let ingredients: Database["public"]["Tables"]["recipe_ingredients"]["Row"][] = [];
  if (ids.length > 0) {
    const { data } = await supabase
      .from("recipe_ingredients")
      .select("*")
      .in("cocktail_id", ids);
    ingredients = data ?? [];
  }

  const ingredientsByCocktail = new Map<
    string,
    Database["public"]["Tables"]["recipe_ingredients"]["Row"][]
  >();
  for (const ingredient of ingredients) {
    const list = ingredientsByCocktail.get(ingredient.cocktail_id) ?? [];
    list.push(ingredient);
    ingredientsByCocktail.set(ingredient.cocktail_id, list);
  }

  const tagsByCocktail = await getTagsByCocktail(supabase, ids);

  const exportPayload = {
    exported_at: new Date().toISOString(),
    account_email: user.email,
    cocktails: rows.map((cocktail) => ({
      name: cocktail.name,
      description: cocktail.description,
      instructions: cocktail.instructions,
      garnish: cocktail.garnish,
      glassware: cocktail.glassware,
      source: cocktail.source,
      favorite: cocktail.favorite,
      status: cocktail.status,
      created_at: cocktail.created_at,
      ingredients: (ingredientsByCocktail.get(cocktail.id) ?? [])
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((ingredient) => ({
          display_name: ingredient.display_name,
          amount: ingredient.amount,
          unit: ingredient.unit,
          qualifier: ingredient.qualifier,
        })),
      tags: (tagsByCocktail[cocktail.id] ?? []).map((tag) => tag.name),
    })),
  };

  const filename = `pourhouse-export-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(exportPayload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
