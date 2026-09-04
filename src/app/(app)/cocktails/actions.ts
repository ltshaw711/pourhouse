"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { buildIngredientMatcher } from "@/lib/ingredient-matching";

// Ingredient rows arrive as several same-named fields
// (ingredient_display_name, ingredient_amount, ...) — the browser submits
// repeated fields in DOM order, so index i across each array describes one
// ingredient row. This also means the form works even if JavaScript fails
// to load, before any client-side row-adding runs.
function parseIngredientRows(formData: FormData) {
  const displayNames = formData.getAll("ingredient_display_name").map(String);
  const amounts = formData.getAll("ingredient_amount").map(String);
  const units = formData.getAll("ingredient_unit").map(String);
  const qualifiers = formData.getAll("ingredient_qualifier").map(String);

  return displayNames
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
}

function parseCocktailFields(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    instructions: String(formData.get("instructions") ?? "").trim() || null,
    garnish: String(formData.get("garnish") ?? "").trim() || null,
    glassware: String(formData.get("glassware") ?? "").trim() || null,
    source: String(formData.get("source") ?? "").trim() || null,
    favorite: formData.get("favorite") === "on",
  };
}

// PRD §6.5: required fields are name and at least one ingredient line.
export async function createCocktail(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const fields = parseCocktailFields(formData);
  if (!fields.name) {
    redirect(`/cocktails/new?error=${encodeURIComponent("Cocktail name is required.")}`);
  }

  const ingredientRows = parseIngredientRows(formData);
  if (ingredientRows.length === 0) {
    redirect(
      `/cocktails/new?error=${encodeURIComponent("Add at least one ingredient.")}`
    );
  }

  // Links each line to the canonical ingredients table on an exact
  // name/alias match, so ingredient-on-hand search can find it — see
  // src/lib/ingredient-matching.ts for what counts as a match.
  const matchIngredient = await buildIngredientMatcher(supabase);
  const linkedIngredientRows = ingredientRows.map((row) => ({
    ...row,
    canonical_ingredient_id: matchIngredient(row.display_name),
  }));

  const { data: cocktail, error: cocktailError } = await supabase
    .from("cocktails")
    .insert({ ...fields, owner_id: user.id, status: "published" })
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
    .insert(linkedIngredientRows.map((row) => ({ ...row, cocktail_id: cocktail.id })));

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

// Bound with the cocktail id (see the edit page) so the client only ever
// submits the edited fields — RLS re-checks ownership on every statement
// below regardless of what the client claims.
export async function updateCocktail(cocktailId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const editUrl = `/cocktails/${cocktailId}/edit`;

  const fields = parseCocktailFields(formData);
  if (!fields.name) {
    redirect(`${editUrl}?error=${encodeURIComponent("Cocktail name is required.")}`);
  }

  const ingredientRows = parseIngredientRows(formData);
  if (ingredientRows.length === 0) {
    redirect(`${editUrl}?error=${encodeURIComponent("Add at least one ingredient.")}`);
  }

  const matchIngredient = await buildIngredientMatcher(supabase);
  const linkedIngredientRows = ingredientRows.map((row) => ({
    ...row,
    canonical_ingredient_id: matchIngredient(row.display_name),
  }));

  const { error: updateError } = await supabase
    .from("cocktails")
    .update(fields)
    .eq("id", cocktailId);

  if (updateError) {
    redirect(`${editUrl}?error=${encodeURIComponent(updateError.message)}`);
  }

  // Simplest correct approach for a personal-scale ingredient list: replace
  // ingredients and tags wholesale rather than diffing old vs. new rows.
  const { error: deleteIngredientsError } = await supabase
    .from("recipe_ingredients")
    .delete()
    .eq("cocktail_id", cocktailId);

  if (deleteIngredientsError) {
    redirect(`${editUrl}?error=${encodeURIComponent(deleteIngredientsError.message)}`);
  }

  const { error: ingredientsError } = await supabase
    .from("recipe_ingredients")
    .insert(linkedIngredientRows.map((row) => ({ ...row, cocktail_id: cocktailId })));

  if (ingredientsError) {
    redirect(`${editUrl}?error=${encodeURIComponent(ingredientsError.message)}`);
  }

  const { error: deleteTagsError } = await supabase
    .from("cocktail_tags")
    .delete()
    .eq("cocktail_id", cocktailId);

  if (deleteTagsError) {
    redirect(`${editUrl}?error=${encodeURIComponent(deleteTagsError.message)}`);
  }

  const tagIds = formData.getAll("tag_ids").map(String);
  if (tagIds.length > 0) {
    const { error: tagsError } = await supabase
      .from("cocktail_tags")
      .insert(tagIds.map((tag_id) => ({ cocktail_id: cocktailId, tag_id })));

    if (tagsError) {
      redirect(`${editUrl}?error=${encodeURIComponent(tagsError.message)}`);
    }
  }

  redirect(`/cocktails/${cocktailId}`);
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

// Bound with (cocktailId, nextValue) wherever it's rendered, so the button
// itself needs no client-side state — it just submits the flipped value.
export async function setFavorite(
  cocktailId: string,
  favorite: boolean,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _formData: FormData
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("cocktails")
    .update({ favorite })
    .eq("id", cocktailId);

  if (error) {
    redirect(`/cocktails/${cocktailId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/cocktails/${cocktailId}`);
  revalidatePath("/library");
}
