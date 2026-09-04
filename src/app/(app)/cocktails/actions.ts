"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { buildIngredientMatcher } from "@/lib/ingredient-matching";
import {
  findDuplicateCandidates,
  type CocktailActionState,
} from "@/lib/duplicate-detection";
import type { CocktailFormValues } from "@/lib/cocktail-form-values";
import { uploadCocktailPhoto, removeCocktailPhotos } from "@/lib/photo-upload";

function getPhotoFile(formData: FormData): File | null {
  const file = formData.get("photo");
  return file instanceof File && file.size > 0 ? file : null;
}

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

// Mirrors whatever was actually submitted, so a validation error or
// duplicate warning can hand it straight back to the form (see the
// CocktailActionState doc comment for why that's necessary at all).
function buildSubmittedValues(
  formData: FormData,
  fields: ReturnType<typeof parseCocktailFields>,
  ingredientRows: ReturnType<typeof parseIngredientRows>
): CocktailFormValues {
  return {
    name: fields.name,
    instructions: fields.instructions ?? undefined,
    garnish: fields.garnish ?? undefined,
    glassware: fields.glassware ?? undefined,
    source: fields.source ?? undefined,
    favorite: fields.favorite,
    ingredients: ingredientRows.map((row) => ({
      display_name: row.display_name,
      amount: row.amount,
      unit: row.unit,
      qualifier: row.qualifier,
    })),
    tagIds: formData.getAll("tag_ids").map(String),
  };
}

// PRD §6.5: required fields are name and at least one ingredient line.
// PRD §6.2: warn on a likely duplicate (same normalized name + materially
// similar ingredients) and let the user save anyway rather than silently
// creating one, or silently blocking it.
//
// Takes (prevState, formData) so the form can drive it through
// useActionState — a validation error or duplicate warning renders in
// place, with the form's own field values still intact, instead of a
// redirect that would otherwise discard everything the user typed.
export async function createCocktail(
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

  const fields = parseCocktailFields(formData);
  const ingredientRows = parseIngredientRows(formData);
  const values = buildSubmittedValues(formData, fields, ingredientRows);

  if (!fields.name) {
    return { error: "Cocktail name is required.", values };
  }
  if (ingredientRows.length === 0) {
    return { error: "Add at least one ingredient.", values };
  }

  // The "Save anyway" button submits confirm_duplicate=true as its own
  // name/value pair (a native HTML feature: only the clicked submit
  // button's name/value is included), skipping the check below.
  if (formData.get("confirm_duplicate") !== "true") {
    const duplicates = await findDuplicateCandidates(
      supabase,
      user.id,
      fields.name,
      ingredientRows.map((row) => row.display_name)
    );
    if (duplicates.length > 0) {
      return { duplicates, values };
    }
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
    return { error: cocktailError?.message ?? "Could not save the cocktail.", values };
  }

  const { error: ingredientsError } = await supabase
    .from("recipe_ingredients")
    .insert(linkedIngredientRows.map((row) => ({ ...row, cocktail_id: cocktail.id })));

  if (ingredientsError) {
    return { error: ingredientsError.message, values };
  }

  const tagIds = formData.getAll("tag_ids").map(String);
  if (tagIds.length > 0) {
    const { error: tagsError } = await supabase
      .from("cocktail_tags")
      .insert(tagIds.map((tag_id) => ({ cocktail_id: cocktail.id, tag_id })));

    if (tagsError) {
      return { error: tagsError.message, values };
    }
  }

  // Uploaded last, after everything else has committed: the cocktail
  // already exists at this point, so a photo failure shouldn't block
  // creation or risk a duplicate on retry — just note it and let the user
  // try again from Edit.
  const photoFile = getPhotoFile(formData);
  if (photoFile) {
    const { url, error: photoError } = await uploadCocktailPhoto(
      supabase,
      user.id,
      cocktail.id,
      photoFile
    );
    if (photoError) {
      redirect(
        `/cocktails/${cocktail.id}?error=${encodeURIComponent(
          `Cocktail saved, but the photo couldn't be uploaded: ${photoError}. Try again from Edit.`
        )}`
      );
    }
    if (url) {
      await supabase.from("cocktails").update({ photo_url: url }).eq("id", cocktail.id);
    }
  }

  redirect(`/cocktails/${cocktail.id}`);
}

// Bound with the cocktail id (see the edit page) so the client only ever
// submits the edited fields — RLS re-checks ownership on every statement
// below regardless of what the client claims. No duplicate check here:
// you're editing one specific cocktail, not creating a new competing one.
export async function updateCocktail(
  cocktailId: string,
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

  const fields = parseCocktailFields(formData);
  const ingredientRows = parseIngredientRows(formData);
  const values = buildSubmittedValues(formData, fields, ingredientRows);

  if (!fields.name) {
    return { error: "Cocktail name is required.", values };
  }
  if (ingredientRows.length === 0) {
    return { error: "Add at least one ingredient.", values };
  }

  const matchIngredient = await buildIngredientMatcher(supabase);
  const linkedIngredientRows = ingredientRows.map((row) => ({
    ...row,
    canonical_ingredient_id: matchIngredient(row.display_name),
  }));

  // A newly-selected file always wins over "remove photo" if somehow both
  // are set. removeCocktailPhotos before uploading means replacing a
  // photo never leaves the old one orphaned in storage.
  const photoFields: { photo_url?: string | null } = {};
  const photoFile = getPhotoFile(formData);
  if (photoFile) {
    const { url, error: photoError } = await uploadCocktailPhoto(
      supabase,
      user.id,
      cocktailId,
      photoFile
    );
    if (photoError) {
      return { error: `Photo couldn't be uploaded: ${photoError}`, values };
    }
    photoFields.photo_url = url;
  } else if (formData.get("remove_photo") === "true") {
    await removeCocktailPhotos(supabase, user.id, cocktailId);
    photoFields.photo_url = null;
  }

  const { error: updateError } = await supabase
    .from("cocktails")
    .update({ ...fields, ...photoFields })
    .eq("id", cocktailId);

  if (updateError) {
    return { error: updateError.message, values };
  }

  // Simplest correct approach for a personal-scale ingredient list: replace
  // ingredients and tags wholesale rather than diffing old vs. new rows.
  const { error: deleteIngredientsError } = await supabase
    .from("recipe_ingredients")
    .delete()
    .eq("cocktail_id", cocktailId);

  if (deleteIngredientsError) {
    return { error: deleteIngredientsError.message, values };
  }

  const { error: ingredientsError } = await supabase
    .from("recipe_ingredients")
    .insert(linkedIngredientRows.map((row) => ({ ...row, cocktail_id: cocktailId })));

  if (ingredientsError) {
    return { error: ingredientsError.message, values };
  }

  const { error: deleteTagsError } = await supabase
    .from("cocktail_tags")
    .delete()
    .eq("cocktail_id", cocktailId);

  if (deleteTagsError) {
    return { error: deleteTagsError.message, values };
  }

  const tagIds = formData.getAll("tag_ids").map(String);
  if (tagIds.length > 0) {
    const { error: tagsError } = await supabase
      .from("cocktail_tags")
      .insert(tagIds.map((tag_id) => ({ cocktail_id: cocktailId, tag_id })));

    if (tagsError) {
      return { error: tagsError.message, values };
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Storage isn't part of the Postgres FK graph, so deleting the row
  // alone would leave any uploaded photo orphaned in the bucket.
  if (user) {
    await removeCocktailPhotos(supabase, user.id, cocktailId);
  }

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
