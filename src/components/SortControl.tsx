"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SORT_COOKIE, PREF_COOKIE_MAX_AGE } from "@/lib/library-prefs";

// Shared by the authenticated Library and the public read-only /shared
// view — fully generic (reads the current pathname), so it works on
// either URL without knowing which one it's on. Defaults to "newest"
// (each page's own default ordering) so existing links keep working
// unless a sort is explicitly picked. Also written to a cookie so a
// *fresh* navigation (the nav bar's "Library" link, no query string)
// still remembers it — the page that reads SORT_COOKIE server-side is
// what actually restores it.
export function SortControl() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const sort = searchParams.get("sort") ?? "newest";

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    // Set explicitly even for "newest" (the default) rather than
    // deleting the param — otherwise picking it back produces a
    // param-less URL that immediately redirects again via the cookie
    // fallback, one wasted round trip for no reason.
    params.set("sort", value);
    document.cookie = `${SORT_COOKIE}=${value}; path=/; max-age=${PREF_COOKIE_MAX_AGE}; samesite=lax`;
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
        <option value="primary">Primary ingredient</option>
      </select>
    </label>
  );
}
