"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Style = { id: string; name: string };

// Independent facet from HaveIngredientsPicker — its own URL param
// (?styles=) and its own "Clear", so picking/clearing one never touches
// the other. Multiple styles are OR'd together (a drink needs any one
// of the selected styles, not all of them), matching the Library tag
// filter's existing semantics for consistency across the app.
export function StylePicker({ styles }: { styles: Style[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedIds = new Set((searchParams.get("styles") ?? "").split(",").filter(Boolean));

  function toggle(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    const ids = new Set(selectedIds);
    if (ids.has(id)) ids.delete(id);
    else ids.add(id);

    if (ids.size > 0) params.set("styles", [...ids].join(","));
    else params.delete("styles");

    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname);
  }

  function clear() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("styles");
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-300">What style of drink?</p>
        {selectedIds.size > 0 && (
          <button
            type="button"
            onClick={clear}
            className="text-xs text-zinc-400 hover:text-zinc-300"
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {styles.map((style) => (
          <button
            key={style.id}
            type="button"
            onClick={() => toggle(style.id)}
            aria-pressed={selectedIds.has(style.id)}
            className={`rounded-full border px-2.5 py-1 text-xs ${
              selectedIds.has(style.id)
                ? "border-orange-400 text-orange-300"
                : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
            }`}
          >
            {style.name}
          </button>
        ))}
      </div>
    </div>
  );
}
