import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TagType } from "@/types/database";

export type CocktailTag = { id: string; name: string; type: TagType };

/**
 * One batched lookup for however many cocktails are on screen, instead of
 * a per-card query — matters once a collection grows past a handful of
 * recipes (PRD §12 performance targets).
 */
export async function getTagsByCocktail(
  supabase: SupabaseClient<Database>,
  cocktailIds: string[]
): Promise<Record<string, CocktailTag[]>> {
  const tagsByCocktail: Record<string, CocktailTag[]> = {};
  if (cocktailIds.length === 0) return tagsByCocktail;

  const { data: cocktailTagRows } = await supabase
    .from("cocktail_tags")
    .select("cocktail_id, tag_id")
    .in("cocktail_id", cocktailIds);

  const tagIds = [...new Set((cocktailTagRows ?? []).map((r) => r.tag_id))];
  if (tagIds.length === 0) return tagsByCocktail;

  const { data: tagRows } = await supabase
    .from("tags")
    .select("id, name, type")
    .in("id", tagIds);

  const tagById = new Map((tagRows ?? []).map((t) => [t.id, t]));

  for (const row of cocktailTagRows ?? []) {
    const tag = tagById.get(row.tag_id);
    if (!tag) continue;
    (tagsByCocktail[row.cocktail_id] ??= []).push(tag);
  }

  return tagsByCocktail;
}

/**
 * PRD §6.3: related recipes based on shared primary/style tags, ranked by
 * how many tags overlap (a shared primary spirit *and* style outranks
 * either alone). Ownership is implicit — RLS already limits `cocktails` to
 * the signed-in owner's rows.
 */
export async function getRelatedCocktailIds(
  supabase: SupabaseClient<Database>,
  cocktailId: string,
  tagIds: string[],
  limit = 4
): Promise<string[]> {
  if (tagIds.length === 0) return [];

  const { data: rows } = await supabase
    .from("cocktail_tags")
    .select("cocktail_id")
    .in("tag_id", tagIds)
    .neq("cocktail_id", cocktailId);

  const sharedTagCount = new Map<string, number>();
  for (const row of rows ?? []) {
    sharedTagCount.set(row.cocktail_id, (sharedTagCount.get(row.cocktail_id) ?? 0) + 1);
  }

  return [...sharedTagCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);
}

/**
 * Matches Apple Notes hashtags (already lowercase, e.g. "tequila") against
 * the existing global primary/style tags by exact normalized name. Like
 * ingredient linking, this never auto-creates a new tag from a guess —
 * unmatched hashtags come back separately so the review screen can show
 * them as informational rather than silently inventing taxonomy entries.
 */
export async function matchHashtagsToTagIds(
  supabase: SupabaseClient<Database>,
  hashtags: string[]
): Promise<{ matchedTagIds: string[]; unmatchedHashtags: string[] }> {
  if (hashtags.length === 0) return { matchedTagIds: [], unmatchedHashtags: [] };

  const { data: tags } = await supabase
    .from("tags")
    .select("id, normalized_name")
    .in("type", ["primary", "style"]);

  const idByNormalizedName = new Map((tags ?? []).map((t) => [t.normalized_name, t.id]));

  const matchedTagIds: string[] = [];
  const unmatchedHashtags: string[] = [];

  for (const hashtag of hashtags) {
    const id = idByNormalizedName.get(hashtag.toLowerCase());
    if (id) matchedTagIds.push(id);
    else unmatchedHashtags.push(hashtag);
  }

  return { matchedTagIds, unmatchedHashtags };
}

/** Canonical primary/style tags for the add/edit form's checkboxes. */
export async function getFormTags(supabase: SupabaseClient<Database>) {
  const { data: tags } = await supabase
    .from("tags")
    .select("id, name, type")
    .in("type", ["primary", "style"])
    .order("name");

  return {
    primaryTags: (tags ?? []).filter((t) => t.type === "primary"),
    styleTags: (tags ?? []).filter((t) => t.type === "style"),
  };
}
