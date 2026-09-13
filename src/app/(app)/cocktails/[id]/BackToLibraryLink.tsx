"use client";

import { useRouter } from "next/navigation";

// A plain <Link href="/library"> always lands on the library's default
// view/sort with no scroll position — it's a fresh navigation, not a
// return trip. Going back through browser history instead reuses the
// exact same history entry the user left (URL, query string, and Next's
// built-in scroll restoration all included), so list vs. grid, the
// active sort/filters, and scroll position all come back exactly as
// they were. Falls back to a plain navigation only when there's no
// history to go back to (e.g. this page was opened directly in a new
// tab) so the button never does nothing.
export function BackToLibraryLink() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push("/library");
      }}
      className="text-sm text-zinc-400 hover:text-zinc-300"
    >
      ← Library
    </button>
  );
}
