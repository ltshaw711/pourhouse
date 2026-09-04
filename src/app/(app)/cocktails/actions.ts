"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// PRD §6.5: required fields are name and at least one ingredient line.
// Everything else is optional. Ingredient rows arrive as several
// same-named fields (ingredient_display_name, ingredient_amount, ...) —
// the browser submits repeated fields in DOM order, so index i across each
// array describes one ingredient row. This also means the form works even
// if JavaScript fails to load, before any client-side row-adding runs.
export async function createCocktail(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    redirect(`/cocktails/new?error=${encodeURIComponent("Cocktail name is required.")}`);
  }

  const displayNames = formData.getAll("ingredient_display_name").map(String);
  const amounts = formData.getAll("ingredient_amount").map(String);
  const units = formData.getAll("ingredient_unit").map(String);
  const qualifiers = formData.getAll("ingredient_qualifier").map(String);

  const ingredientRows = displayNames
    .map((rawName, i) => {
      const display_name = rawName.trim();
      const amountRaw = amounts[i]?.trim();
      return {
        display_name,
        amount: amountRaw ? Number(amountRaw) : null,
        unit: units[i]?.trim() || null,
        qualifier: qualifiers[i]?.trim() || null,
        position: i,
      };
    })
    .filter((row) => row.display_name.length > 0);

  if (ingredientRows.length === 0) {
    redirect(
      `/cocktails/new?error=${encodeURIComponent("Add at least one ingredient.")}`
    );
  }

  const { data: cocktail, error: cocktailError } = await supabase
    .from("cocktails")
    .insert({
      owner_id: user.id,
      name,
      description: String(formData.get("description") ?? "").trim() || null,
      instructions: String(formData.get("instructions") ?? "").trim() || null,
      garnish: String(formData.get("garnish") ?? "").trim() || null,
      glassware: String(formData.get("glassware") ?? "").trim() || null,
      source: String(formData.get("source") ?? "").trim() || null,
      favorite: formData.get("favorite") === "on",
      status: "published",
    })
    .select("id")
    .single();

  if (cocktailError || !cocktail) {
    redirect(
      `/cocktails/new?error=${encodeURIComponent(
        cocktailError?.message ?? "Could not save the cocktail."
      )}`
    );
  }

  const { error: ingredientsError } = await supabase
    .from("recipe_ingredients")
    .insert(ingredientRows.map((row) => ({ ...row, cocktail_id: cocktail.id })));

  if (ingredientsError) {
    redirect(`/cocktails/new?error=${encodeURIComponent(ingredientsError.message)}`);
  }

  const tagIds = formData.getAll("tag_ids").map(String);
  if (tagIds.length > 0) {
    const { error: tagsError } = await supabase
      .from("cocktail_tags")
      .insert(tagIds.map((tag_id) => ({ cocktail_id: cocktail.id, tag_id })));

    if (tagsError) {
      redirect(`/cocktails/new?error=${encodeURIComponent(tagsError.message)}`);
    }
  }

  redirect(`/cocktails/${cocktail.id}`);
}

// Bound with the cocktail id (see DeleteCocktailButton) so the client only
// ever needs to confirm and submit — RLS still re-checks ownership itself.
// The second param is required by the bind(id) + <form action> pattern
// even though it's unused here.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function deleteCocktail(cocktailId: string, _formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("cocktails").delete().eq("id", cocktailId);

  if (error) {
    redirect(`/cocktails/${cocktailId}?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/library");
}
