"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type DeleteAccountState = { error?: string } | null;

// PRD §11: account/data deletion controls. Every table that owns user data
// (cocktails, recipe_ingredients, cocktail_tags, custom tags,
// import_batches, import_items, profiles) has owner_id/id referencing
// auth.users with ON DELETE CASCADE — deleting the auth user is enough to
// remove everything, no manual cleanup queries needed. That deletion can
// only happen through the admin API (service-role key), which a user's
// own session can never do — this is the one place in the app that needs
// SUPABASE_SERVICE_ROLE_KEY.
export async function deleteAccount(
  _prevState: DeleteAccountState,
  formData: FormData
): Promise<DeleteAccountState> {
  const confirmation = String(formData.get("confirm") ?? "").trim();
  if (confirmation !== "DELETE") {
    return { error: 'Type "DELETE" (all caps) to confirm.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Account deletion is not configured yet.",
    };
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return { error: error.message };
  }

  await supabase.auth.signOut();
  redirect(
    `/sign-in?notice=${encodeURIComponent(
      "Your account and all its data have been permanently deleted."
    )}`
  );
}

// Public read-only share link (code-only feature, not in the PRD). The
// token itself is the access control — RLS still locks every table down
// to the owner as before; a handful of SECURITY DEFINER functions
// (supabase/migrations/0005_public_share.sql) do the token check and
// hand back only read-only fields to /shared/[token]. Regenerating swaps
// in a fresh token, which immediately invalidates any previously-shared
// link — no separate "revoke" bookkeeping needed for that case.
export async function regenerateShareLink() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { error } = await supabase
    .from("profiles")
    .update({ share_token: randomUUID() })
    .eq("id", user.id);

  if (error) {
    redirect(`/settings?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/settings");
}

export async function disableSharing() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { error } = await supabase
    .from("profiles")
    .update({ share_token: null })
    .eq("id", user.id);

  if (error) {
    redirect(`/settings?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/settings");
}
