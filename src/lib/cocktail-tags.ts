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
