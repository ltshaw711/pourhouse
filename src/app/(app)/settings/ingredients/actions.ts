"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { IngredientActionState } from "@/lib/ingredient-form-values";

function parseAliases(text: string): string[] {
  return text
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);
}

function friendlyError(error: { code?: string; message: string }, name: string): string {
  // 23505 = unique_violation — normalized_name already exists.
  return error.code === "23505"
    ? `"${name}" is already in your ingredient list.`
    : error.message;
}

export async function createIngredient(
  _prevState: IngredientActionState,
  formData: FormData
): Promise<IngredientActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const canonical_name = String(formData.get("canonical_name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() || null;
  const aliasesText = String(formData.get("aliases") ?? "");
  const values = { canonical_name, category: category ?? undefined, aliasesText };

  if (!canonical_name) {
    return { error: "Ingredient name is required.", values };
  }

  const { error } = await supabase.from("ingredients").insert({
    canonical_name,
    category,
    aliases: parseAliases(aliasesText),
  });

  if (error) {
    return { error: friendlyError(error, canonical_name), values };
  }

  revalidatePath("/settings/ingredients");
  revalidatePath("/"); // Home page's ingredient-chip list
  redirect("/settings/ingredients");
}

// Bound with the ingredient id (see the edit page) so the client only
// submits the edited fields.
export async function updateIngredient(
  ingredientId: string,
  _prevState: IngredientActionState,
  formData: FormData
): Promise<IngredientActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const canonical_name = String(formData.get("canonical_name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() || null;
  const aliasesText = String(formData.get("aliases") ?? "");
  const values = { canonical_name, category: category ?? undefined, aliasesText };

  if (!canonical_name) {
    return { error: "Ingredient name is required.", values };
  }

  const { error } = await supabase
    .from("ingredients")
    .update({ canonical_name, category, aliases: parseAliases(aliasesText) })
    .eq("id", ingredientId);

  if (error) {
    return { error: friendlyError(error, canonical_name), values };
  }

  revalidatePath("/settings/ingredients");
  revalidatePath("/");
  redirect("/settings/ingredients");
}

// Safe to allow: recipe_ingredients.canonical_ingredient_id is
// ON DELETE SET NULL, so existing recipes keep their ingredient text and
// just lose the canonical link (falls back to free text).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function deleteIngredient(ingredientId: string, _formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  await supabase.from("ingredients").delete().eq("id", ingredientId);
  revalidatePath("/settings/ingredients");
  revalidatePath("/");
}
