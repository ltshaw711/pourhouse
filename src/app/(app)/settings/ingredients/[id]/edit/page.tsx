import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateIngredient } from "../../actions";
import { IngredientForm } from "../../IngredientForm";

export default async function EditIngredientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: ingredient } = await supabase
    .from("ingredients")
    .select("*")
    .eq("id", id)
    .single();

  if (!ingredient) notFound();

  const updateThisIngredient = updateIngredient.bind(null, ingredient.id);

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <Link
        href="/settings/ingredients"
        className="text-sm text-zinc-400 hover:text-zinc-300"
      >
        ← Ingredients
      </Link>
      <h1 className="mt-4 text-3xl font-semibold text-zinc-50">Edit ingredient</h1>
      <div className="mt-8">
        <IngredientForm
          action={updateThisIngredient}
          submitLabel="Save changes"
          initial={{
            canonical_name: ingredient.canonical_name,
            category: ingredient.category ?? undefined,
            aliasesText: ingredient.aliases.join(", "),
          }}
        />
      </div>
    </main>
  );
}
