import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { CocktailFormValues } from "@/lib/cocktail-form-values";

export type DuplicateCandidate = {
  id: string;
  name: string;
  matchedIngredients: number;
  totalIngredients: number;
};

// A candidate needs at least half its combined ingredient list (matched ∪
// unmatched) in common to count as "materially similar" — coincidental
// overlap on one or two mixers shouldn't flag two unrelated recipes.
const SIMILARITY_THRESHOLD = 0.5;

function normalize(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * PRD §6.2: "likely duplicates (normalized name plus materially similar
 * ingredient list)" — both signals together. Name alone isn't enough (two
 * different Old Fashioned riffs aren't duplicates); ingredient overlap
 * alone isn't enough either (unrelated recipes can share a mixer). Costs
 * one query per same-named candidate, which is fine — there's rarely more
 * than one or two cocktails sharing an exact normalized name.
 */
export async function findDuplicateCandidates(
  supabase: SupabaseClient<Database>,
  ownerId: string,
  name: string,
  ingredientDisplayNames: string[],
  excludeCocktailId?: string
): Promise<DuplicateCandidate[]> {
  const normalizedName = normalize(name);
  if (!normalizedName || ingredientDisplayNames.length === 0) return [];

  let query = supabase
    .from("cocktails")
    .select("id, name")
    .eq("owner_id", ownerId)
    .eq("normalized_name", normalizedName);

  if (excludeCocktailId) {
    query = query.neq("id", excludeCocktailId);
  }

  const { data: nameMatches } = await query;
  if (!nameMatches || nameMatches.length === 0) return [];

  const newIngredientSet = new Set(ingredientDisplayNames.map(normalize));
  const candidates: DuplicateCandidate[] = [];

  for (const candidate of nameMatches) {
    const { data: candidateIngredients } = await supabase
      .from("recipe_ingredients")
      .select("display_name")
      .eq("cocktail_id", candidate.id);

    const candidateSet = new Set(
      (candidateIngredients ?? []).map((i) => normalize(i.display_name))
    );
    const matchedIngredients = [...newIngredientSet].filter((n) => candidateSet.has(n)).length;
    const totalIngredients = new Set([...newIngredientSet, ...candidateSet]).size;
    const similarity = totalIngredients === 0 ? 0 : matchedIngredients / totalIngredients;

    if (similarity >= SIMILARITY_THRESHOLD) {
      candidates.push({ id: candidate.id, name: candidate.name, matchedIngredients, totalIngredients });
    }
  }

  return candidates;
}

/**
 * Shared result shape for the add/edit form's Server Action, passed
 * through React's useActionState so validation errors and duplicate
 * warnings render in place. `values` carries back whatever the user
 * submitted: Next.js refreshes the route's Server Components after a
 * Server Action even without redirect(), and that refresh can reset the
 * form's uncontrolled inputs — so the action hands the submission back
 * rather than relying on the DOM to have preserved it.
 */
export type CocktailActionState = {
  error?: string;
  duplicates?: DuplicateCandidate[];
  values?: CocktailFormValues;
} | null;
