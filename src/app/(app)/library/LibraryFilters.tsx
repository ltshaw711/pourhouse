"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";

type Tag = { id: string; name: string };

// PRD §6.3: search-as-you-type (debounced client nav, not a full reload),
// favorites filter, and tag chips instead of typing — all reflected in the
// URL so a filtered view stays shareable for the signed-in user themself.
export function LibraryFilters({
  primaryTags,
  styleTags,
}: {
  primaryTags: Tag[];
  styleTags: Tag[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedTagIds = new Set(
    (searchParams.get("tags") ?? "").split(",").filter(Boolean)
  );
  const favoriteOnly = searchParams.get("favorite") === "true";
  const sort = searchParams.get("sort") ?? "newest";
  const hasFilters = q.trim().length > 0 || selectedTagIds.size > 0 || favoriteOnly;

  function updateParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname);
  }

  function handleQueryChange(value: string) {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateParams((params) => {
        if (value.trim()) params.set("q", value.trim());
        else params.delete("q");
      });
    }, 250);
  }

  function toggleTag(id: string) {
    updateParams((params) => {
      const ids = new Set(selectedTagIds);
      if (ids.has(id)) ids.delete(id);
      else ids.add(id);
      if (ids.size > 0) params.set("tags", [...ids].join(","));
      else params.delete("tags");
    });
  }

  function toggleFavoriteOnly() {
    updateParams((params) => {
      if (favoriteOnly) params.delete("favorite");
      else params.set("favorite", "true");
    });
  }

  function handleSortChange(value: string) {
    updateParams((params) => {
      if (value === "newest") params.delete("sort");
      else params.set("sort", value);
    });
  }

  function clearFilters() {
    setQ("");
    router.replace(pathname);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={q}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Search by name…"
          aria-label="Search cocktails by name"
          className="w-full max-w-xs rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/40"
        />
        <button
          type="button"
          onClick={toggleFavoriteOnly}
          aria-pressed={favoriteOnly}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${
            favoriteOnly
              ? "border-orange-400 text-orange-300"
              : "border-zinc-700 text-zinc-300 hover:border-zinc-500"
          }`}
        >
          {favoriteOnly ? "★ Favorites only" : "☆ Favorites only"}
        </button>
        <label className="flex shrink-0 items-center gap-1.5 text-xs text-zinc-400">
          Sort
          <select
            value={sort}
            onChange={(e) => handleSortChange(e.target.value)}
            aria-label="Sort cocktails"
            className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/40"
          >
            <option value="newest">Newest first</option>
            <option value="name-asc">Name A to Z</option>
            <option value="name-desc">Name Z to A</option>
          </select>
        </label>
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="shrink-0 text-xs text-zinc-400 hover:text-zinc-300"
          >
            Clear filters
          </button>
        )}
      </div>

      {(primaryTags.length > 0 || styleTags.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {[...primaryTags, ...styleTags].map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag.id)}
              aria-pressed={selectedTagIds.has(tag.id)}
              className={`rounded-full border px-2.5 py-1 text-xs ${
                selectedTagIds.has(tag.id)
                  ? "border-orange-400 text-orange-300"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
              }`}
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
