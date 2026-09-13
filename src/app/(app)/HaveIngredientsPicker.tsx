"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Ingredient = { id: string; canonical_name: string };

// PRD §6.3: ingredient chips instead of typing, reflected in the URL.
export function HaveIngredientsPicker({ ingredients }: { ingredients: Ingredient[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const haveIds = new Set((searchParams.get("have") ?? "").split(",").filter(Boolean));

  function toggle(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    const ids = new Set(haveIds);
    if (ids.has(id)) ids.delete(id);
    else ids.add(id);

    if (ids.size > 0) params.set("have", [...ids].join(","));
    else params.delete("have");

    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-300">What do you have on hand?</p>
        {haveIds.size > 0 && (
          <button
            type="button"
            onClick={() => router.replace(pathname)}
            className="text-xs text-zinc-400 hover:text-zinc-300"
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ingredients.map((ingredient) => (
          <button
            key={ingredient.id}
            type="button"
            onClick={() => toggle(ingredient.id)}
            aria-pressed={haveIds.has(ingredient.id)}
            className={`rounded-full border px-2.5 py-1 text-xs ${
              haveIds.has(ingredient.id)
                ? "border-orange-400 text-orange-300"
                : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
            }`}
          >
            {ingredient.canonical_name}
          </button>
        ))}
        <Link
          href="/settings/ingredients"
          className="rounded-full border border-dashed border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
        >
          + Add ingredient
        </Link>
      </div>
    </div>
  );
}
