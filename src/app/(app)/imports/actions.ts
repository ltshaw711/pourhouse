"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseAppleNoteMarkdown, type StoredImportItem } from "@/lib/import-parser";
import { matchHashtagsToTagIds } from "@/lib/cocktail-tags";
import { buildIngredientMatcher } from "@/lib/ingredient-matching";
import { findDuplicateCandidates } from "@/lib/duplicate-detection";
import type { CocktailActionState } from "@/lib/duplicate-detection";
import type { CocktailFormValues } from "@/lib/cocktail-form-values";

export type UploadState = { error?: string } | null;

const MAX_FILES = 50;
const MAX_FILE_BYTES = 512 * 1024; // generous for a text note; images aren't read

function stripHtmlTags(raw: string): string {
  return raw.replace(/<[^>]+>/g, "");
}

// PRD §6.6: upload, parse, and stage every note as a reviewable
// import_item — nothing becomes a real cocktail until the user confirms
// it on the review screen (see approveImportItem below).
export async function createImportBatch(
  _prevState: UploadState,
  formData: FormData
): Promise<UploadState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const files = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (files.length === 0) {
    return { error: "Choose at least one .md, .txt, or .html file to import." };
  }
  if (files.length > MAX_FILES) {
    return { error: `Import up to ${MAX_FILES} files at a time — you selected ${files.length}.` };
  }

  const { data: batch, error: batchError } = await supabase
    .from("import_batches")
    .insert({ owner_id: user.id, source: "apple_notes", status: "processing" })
    .select("id")
    .single();

  if (batchError || !batch) {
    return { error: batchError?.message ?? "Could not start the import." };
  }

  const matchIngredient = await buildIngredientMatcher(supabase);
  let staged = 0;

  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) continue; // silently skipped — not a recipe note

    const rawText = await file.text();
    // PRD §6.6: blank notes are skipped, not staged for review.
    if (!rawText.trim()) continue;

    const isHtml = /\.html?$/i.test(file.name);
    const raw = isHtml ? stripHtmlTags(rawText) : rawText;

    const fallbackTitle = file.name.replace(/\.(md|txt|html?)$/i, "");
    const parsed = parseAppleNoteMarkdown(raw, fallbackTitle);

    const [{ matchedTagIds, unmatchedHashtags }, linkedIngredients] = await Promise.all([
      matchHashtagsToTagIds(supabase, parsed.hashtags),
      Promise.resolve(
        parsed.ingredients.map((ing) => ({
          ...ing,
          canonical_ingredient_id: matchIngredient(ing.display_name),
        }))
      ),
    ]);

    const stored: StoredImportItem = {
      ...parsed,
      ingredients: linkedIngredients,
      matched_tag_ids: matchedTagIds,
      unmatched_hashtags: unmatchedHashtags,
    };

    const { error: itemError } = await supabase.from("import_items").insert({
      batch_id: batch.id,
      raw_source: rawText,
      parsed: stored,
      confidence: parsed.confidence,
      status: "needs_review",
    });

    if (!itemError) staged++;
  }

  await supabase
    .from("import_batches")
    .update({ status: "completed" })
    .eq("id", batch.id);

  if (staged === 0) {
    redirect(`/imports?error=${encodeURIComponent("No importable notes were found in that selection.")}`);
  }

  redirect(`/imports/${batch.id}`);
}

// Bound with (itemId, batchId) — matches the same useActionState contract
// as createCocktail/updateCocktail, including duplicate detection, so
// CocktailForm can drive this exactly like the manual add form.
export async function approveImportItem(
  itemId: string,
  batchId: string,
  _prevState: CocktailActionState,
  formData: FormData
): Promise<CocktailActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const name = String(formData.get("name") ?? "").trim();
  const values: CocktailFormValues = {
    name,
    instructions: String(formData.get("instructions") ?? "").trim() || undefined,
    garnish: String(formData.get("garnish") ?? "").trim() || undefined,
    glassware: String(formData.get("glassware") ?? "").trim() || undefined,
    source: String(formData.get("source") ?? "").trim() || undefined,
    favorite: formData.get("favorite") === "on",
    tagIds: formData.getAll("tag_ids").map(String),
  };

  if (!name) {
    return { error: "Cocktail name is required.", values };
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

  values.ingredients = ingredientRows.map((row) => ({
    display_name: row.display_name,
    amount: row.amount,
    unit: row.unit,
    qualifier: row.qualifier,
  }));

  if (ingredientRows.length === 0) {
    return { error: "Add at least one ingredient.", values };
  }

  if (formData.get("confirm_duplicate") !== "true") {
    const duplicates = await findDuplicateCandidates(
      supabase,
      user.id,
      name,
      ingredientRows.map((row) => row.display_name)
    );
    if (duplicates.length > 0) {
      return { duplicates, values };
    }
  }

  const matchIngredient = await buildIngredientMatcher(supabase);
  const linkedIngredientRows = ingredientRows.map((row) => ({
    ...row,
    canonical_ingredient_id: matchIngredient(row.display_name),
  }));

  const { data: cocktail, error: cocktailError } = await supabase
    .from("cocktails")
    .insert({
      owner_id: user.id,
      name,
      instructions: values.instructions ?? null,
      garnish: values.garnish ?? null,
      glassware: values.glassware ?? null,
      source: values.source || "Apple Notes",
      favorite: values.favorite ?? false,
      status: "published",
    })
    .select("id")
    .single();

  if (cocktailError || !cocktail) {
    return { error: cocktailError?.message ?? "Could not save the cocktail.", values };
  }

  const { error: ingredientsError } = await supabase
    .from("recipe_ingredients")
    .insert(linkedIngredientRows.map((row) => ({ ...row, cocktail_id: cocktail.id })));

  if (ingredientsError) {
    return { error: ingredientsError.message, values };
  }

  const tagIds = values.tagIds ?? [];
  if (tagIds.length > 0) {
    const { error: tagsError } = await supabase
      .from("cocktail_tags")
      .insert(tagIds.map((tag_id) => ({ cocktail_id: cocktail.id, tag_id })));

    if (tagsError) {
      return { error: tagsError.message, values };
    }
  }

  await supabase
    .from("import_items")
    .update({ status: "imported", matched_cocktail_id: cocktail.id })
    .eq("id", itemId);

  redirect(`/imports/${batchId}`);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function skipImportItem(itemId: string, batchId: string, _formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  await supabase.from("import_items").update({ status: "skipped" }).eq("id", itemId);
  revalidatePath(`/imports/${batchId}`);
}
