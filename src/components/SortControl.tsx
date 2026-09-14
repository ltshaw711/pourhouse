"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

// Shared by the authenticated Library and the public read-only /shared
// view — fully generic (reads the current pathname), so it works on
// either URL without knowing which one it's on. Defaults to "newest"
// (each page's own default ordering) so existing links keep working
// unless a sort is explicitly picked.
export function SortControl() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const sort = searchParams.get("sort") ?? "newest";

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "newest") params.delete("sort");
    else params.set("sort", value);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <label className="flex shrink-0 items-center gap-1.5 text-xs text-zinc-400">
      Sort
      <select
        value={sort}
        onChange={(e) => handleChange(e.target.value)}
        aria-label="Sort cocktails"
        className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/40"
      >
        <option value="newest">Newest first</option>
        <option value="name-asc">Name A to Z</option>
        <option value="name-desc">Name Z to A</option>
      </select>
    </label>
  );
}
