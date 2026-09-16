"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TagActionState } from "@/lib/tag-form-values";

function friendlyError(error: { code?: string; message: string }, name: string, type: string): string {
  // 23505 = unique_violation — normalized_name already exists for this type.
  return error.code === "23505"
    ? `"${name}" is already a ${type} tag.`
    : error.message;
}

function revalidateTagConsumers() {
  revalidatePath("/settings/tags");
  revalidatePath("/library");
  revalidatePath("/cocktails/new");
  // Layout-level revalidation to cover every instance of the dynamic
  // route, not just whichever id was last visited.
  revalidatePath("/cocktails/[id]/edit", "page");
}

export async function createTag(
  _prevState: TagActionState,
  formData: FormData
): Promise<TagActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const values = { name, type: type === "style" ? ("style" as const) : ("primary" as const) };

  if (!name) {
    return { error: "Tag name is required.", values };
  }
  if (type !== "primary" && type !== "style") {
    return { error: "Choose a tag type.", values };
  }

  const { error } = await supabase.from("tags").insert({ name, type });

  if (error) {
    return { error: friendlyError(error, name, type), values };
  }

  revalidateTagConsumers();
  redirect("/settings/tags");
}

// Bound with the tag id (see the edit page) so the client only submits
// the edited fields.
export async function updateTag(
  tagId: string,
  _prevState: TagActionState,
  formData: FormData
): Promise<TagActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const values = { name, type: type === "style" ? ("style" as const) : ("primary" as const) };

  if (!name) {
    return { error: "Tag name is required.", values };
  }
  if (type !== "primary" && type !== "style") {
    return { error: "Choose a tag type.", values };
  }

  const { error } = await supabase
    .from("tags")
    .update({ name, type })
    .eq("id", tagId);

  if (error) {
    return { error: friendlyError(error, name, type), values };
  }

  revalidateTagConsumers();
  redirect("/settings/tags");
}

// Destructive, unlike ingredient deletion: cocktail_tags.tag_id is
// ON DELETE CASCADE (no ON DELETE SET NULL fallback), so this removes
// the tag from every cocktail carrying it, not just the taxonomy entry.
// The confirm dialog (DeleteTagButton) says so explicitly.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function deleteTag(tagId: string, _formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  await supabase.from("tags").delete().eq("id", tagId);
  revalidateTagConsumers();
}
