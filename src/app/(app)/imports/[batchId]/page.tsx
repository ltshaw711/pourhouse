import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getFormTags } from "@/lib/cocktail-tags";
import { getIngredientOptions } from "@/lib/ingredient-matching";
import type { StoredImportItem } from "@/lib/import-parser";
import { approveImportItem, skipImportItem } from "../actions";
import { CocktailForm } from "@/components/CocktailForm";

// Import review — PRD §6.6: preview every candidate, edit freely, exclude
// notes, get a duplicate warning (reusing the same flow as manual add),
// and confirm one at a time. The batch's report is just live counts by
// status — nothing to keep separately in sync.
export default async function ImportBatchPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;
  const supabase = await createClient();

  const { data: batch } = await supabase
    .from("import_batches")
    .select("*")
    .eq("id", batchId)
    .single();

  if (!batch) notFound();

  const { data: items } = await supabase
    .from("import_items")
    .select("*")
    .eq("batch_id", batchId)
    .order("created_at", { ascending: true });

  const rows = items ?? [];
  const needsReview = rows.filter((i) => i.status === "needs_review");
  const processed = rows.filter((i) => i.status !== "needs_review");
  const importedCount = processed.filter((i) => i.status === "imported").length;
  const skippedCount = processed.filter((i) => i.status === "skipped").length;

  const [{ primaryTags, styleTags }, ingredientOptions] = await Promise.all([
    getFormTags(supabase),
    getIngredientOptions(supabase),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/imports" className="text-sm text-zinc-400 hover:text-zinc-300">
        ← Imports
      </Link>
      <h1 className="mt-4 text-3xl font-semibold text-zinc-50">Review import</h1>
      <p className="mt-1 text-sm text-zinc-400">
        {needsReview.length} to review · {importedCount} imported · {skippedCount} skipped
      </p>

      {needsReview.length === 0 ? (
        <p className="mt-10 text-zinc-300">
          Nothing left to review in this batch.
        </p>
      ) : (
        <div className="mt-8 flex flex-col gap-4">
          {needsReview.map((item) => {
            const parsed = item.parsed as unknown as StoredImportItem;
            const approve = approveImportItem.bind(null, item.id, batchId);
            const skip = skipImportItem.bind(null, item.id, batchId);

            return (
              <details
                key={item.id}
                className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 open:pb-6"
              >
                <summary className="flex cursor-pointer flex-wrap items-baseline gap-x-2 gap-y-1 text-zinc-100">
                  <span className="font-medium">{parsed.name}</span>
                  <span className="text-xs text-zinc-400">
                    {parsed.ingredients.length === 0
                      ? parsed.hasImage
                        ? "photo only — no text to parse, add ingredients manually"
                        : "no ingredients detected"
                      : `${parsed.ingredients.length} ingredient${
                          parsed.ingredients.length === 1 ? "" : "s"
                        } detected`}
                  </span>
                </summary>

                <div className="mt-4">
                  <CocktailForm
                    action={approve}
                    primaryTags={primaryTags}
                    styleTags={styleTags}
                    ingredientOptions={ingredientOptions}
                    submitLabel="Import this cocktail"
                    initial={{
                      name: parsed.name,
                      instructions: parsed.instructions ?? undefined,
                      source: parsed.source_url ?? "Apple Notes",
                      ingredients: parsed.ingredients.map((ing) => ({
                        display_name: ing.display_name,
                        amount: ing.amount,
                        unit: ing.unit,
                        qualifier: null,
                      })),
                      tagIds: parsed.matched_tag_ids,
                    }}
                  />

                  {parsed.unmatched_hashtags.length > 0 && (
                    <p className="mt-3 text-xs text-zinc-400">
                      Also tagged in the original note, but not in your tag
                      list: {parsed.unmatched_hashtags.map((t) => `#${t}`).join(", ")}
                    </p>
                  )}

                  <form action={skip} className="mt-4">
                    <button
                      type="submit"
                      className="text-sm text-zinc-400 hover:text-zinc-300"
                    >
                      Skip this note
                    </button>
                  </form>
                </div>
              </details>
            );
          })}
        </div>
      )}

      {processed.length > 0 && (
        <div className="mt-10">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-400">
            Already processed
          </h2>
          <ul className="mt-3 flex flex-col gap-1.5 text-sm">
            {processed.map((item) => {
              const parsed = item.parsed as unknown as StoredImportItem;
              return (
                <li key={item.id} className="flex items-center gap-2 text-zinc-300">
                  <span>{parsed.name}</span>
                  <span className="text-zinc-400">— {item.status}</span>
                  {item.status === "imported" && item.matched_cocktail_id && (
                    <Link
                      href={`/cocktails/${item.matched_cocktail_id}`}
                      className="text-orange-400 hover:underline"
                    >
                      View
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </main>
  );
}
