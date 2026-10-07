"use client";

import { useRouter } from "next/navigation";

// A plain <Link href="/library"> always lands on the library's default
// view/sort with no scroll position — it's a fresh navigation, not a
// return trip. Going back through browser history instead reuses the
// exact same history entry the user left (URL, query string, and Next's
// built-in scroll restoration all included), so list vs. grid, the
// active sort/filters, and scroll position all come back exactly as
// they were.
//
// The hard part is knowing there's a library entry to go back *to*.
// Default (signed-in owner): any history at all is good enough, and the
// button falls back to a plain navigation only when there's none (page
// opened directly in a new tab) so it never does nothing.
//
// That heuristic is too loose for the public share view: a visitor who
// opens a shared drink straight from an email or chat has earlier
// history too, and "back" would drop them out of the app. So the public
// pages pass `visitedKey` — a sessionStorage flag RememberLibraryVisit
// sets when this tab actually rendered the library — and we only go
// back when that flag is there, else navigate to `fallbackHref`.
export function BackToLibraryLink({
  fallbackHref = "/library",
  visitedKey,
}: {
  fallbackHref?: string;
  visitedKey?: string;
}) {
  const router = useRouter();

  function cameFromLibrary(): boolean {
    if (!visitedKey) return window.history.length > 1;
    try {
      return window.sessionStorage.getItem(visitedKey) === "1" && window.history.length > 1;
    } catch {
      // Storage can throw (blocked site data, some private modes) — treat
      // as "unknown" and take the safe route to the library.
      return false;
    }
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (cameFromLibrary()) router.back();
        else router.push(fallbackHref);
      }}
      className="text-sm text-zinc-400 hover:text-zinc-300"
    >
      ← Library
    </button>
  );
}
