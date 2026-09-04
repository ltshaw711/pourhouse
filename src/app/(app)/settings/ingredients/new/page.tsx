import Link from "next/link";
import { createIngredient } from "../actions";
import { IngredientForm } from "../IngredientForm";

export default function NewIngredientPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <Link
        href="/settings/ingredients"
        className="text-sm text-zinc-400 hover:text-zinc-300"
      >
        ← Ingredients
      </Link>
      <h1 className="mt-4 text-3xl font-semibold text-zinc-50">Add ingredient</h1>
      <div className="mt-8">
        <IngredientForm action={createIngredient} submitLabel="Add ingredient" />
      </div>
    </main>
  );
}
