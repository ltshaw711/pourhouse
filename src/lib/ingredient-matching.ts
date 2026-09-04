import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

function normalize(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Canonical-ingredient names for the add/edit form's <datalist> — nudges
 * users toward an exact match without forcing one (PRD §6.4: free-text
 * ingredients stay supported for unusual recipes).
 */
export async function getIngredientOptions(
  supabase: SupabaseClient<Database>
): Promise<string[]> {
  const { data } = await supabase
    .from("ingredients")
    .select("canonical_name")
    .order("canonical_name");
  return (data ?? []).map((i) => i.canonical_name);
}

/**
 * Builds a lookup from typed ingredient text to a canonical ingredient id,
 * fetching the (small) canonical list once rather than per-row. Only
 * exact matches on the canonical name or a known alias link — anything
 * else is left as plain text rather than guessed at (same "never silently
 * fabricate" principle the PRD applies to import parsing, §6.6). A recipe
 * line without a match still saves fine; it just can't participate in
 * ingredient-on-hand search until it's linked.
 */
export async function buildIngredientMatcher(
  supabase: SupabaseClient<Database>
): Promise<(displayName: string) => string | null> {
  const { data } = await supabase.from("ingredients").select("id, normalized_name, aliases");

  const byNormalizedName = new Map<string, string>();
  for (const ingredient of data ?? []) {
    byNormalizedName.set(ingredient.normalized_name, ingredient.id);
    for (const alias of ingredient.aliases) {
      byNormalizedName.set(normalize(alias), ingredient.id);
    }
  }

  return (displayName: string) => byNormalizedName.get(normalize(displayName)) ?? null;
}

export type IngredientMatch = {
  status: "make-now" | "almost";
  matchedCount: number;
  missingIds: string[];
};

/**
 * PRD §6.3: "Make now" when every one of a recipe's linked ingredients is
 * in the have-set; "Almost" when some but not all are, with the rest named
 * as missing. Ingredient lines with no canonical link are not part of
 * `requiredIds` at all (see buildIngredientMatcher) — they neither block
 * "Make now" nor count toward a match, since there is nothing reliable to
 * compare. A recipe with zero overlap returns null: it is not a result for
 * this search, not merely a bad one.
 */
export function classifyIngredientMatch(
  requiredIds: Set<string>,
  haveIds: Set<string>
): IngredientMatch | null {
  const missingIds = [...requiredIds].filter((id) => !haveIds.has(id));
  const matchedCount = requiredIds.size - missingIds.length;
  if (matchedCount === 0) return null;

  return {
    status: missingIds.length === 0 ? "make-now" : "almost",
    matchedCount,
    missingIds,
  };
}
