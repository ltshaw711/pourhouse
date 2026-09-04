import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// PRD §6.5 / §10 / §11. Bucket + policies: supabase/migrations/0003_storage.sql.
const BUCKET = "cocktail-photos";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/**
 * Removes every stored file under this cocktail's folder. Called before a
 * new upload (so replacing a photo never orphans the old one), when a
 * user explicitly removes a photo, and when the cocktail itself is
 * deleted — storage isn't part of the Postgres FK graph, so nothing
 * cleans this up automatically the way ON DELETE CASCADE does for rows.
 */
export async function removeCocktailPhotos(
  supabase: SupabaseClient<Database>,
  userId: string,
  cocktailId: string
): Promise<void> {
  const folder = `${userId}/${cocktailId}`;
  const { data: objects } = await supabase.storage.from(BUCKET).list(folder);
  if (objects && objects.length > 0) {
    await supabase.storage.from(BUCKET).remove(objects.map((o) => `${folder}/${o.name}`));
  }
}

export async function uploadCocktailPhoto(
  supabase: SupabaseClient<Database>,
  userId: string,
  cocktailId: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { url: null, error: "Photos must be JPEG, PNG, WebP, or GIF." };
  }
  if (file.size > MAX_BYTES) {
    return { url: null, error: "Photo must be under 5MB." };
  }

  await removeCocktailPhotos(supabase, userId, cocktailId);

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${userId}/${cocktailId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
  });

  if (error) return { url: null, error: error.message };

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}
