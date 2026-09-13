"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

// PRD follow-up: grid view (default) shows a big thumbnail per card; list
// view trades that for a small thumbnail so more cocktails fit on screen
// at once. Reflected in the URL like every other library control, so a
// bookmarked/shared library URL keeps its view too.
export function ViewToggle({ view }: { view: "grid" | "list" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setView(next: "grid" | "list") {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "grid") params.delete("view");
    else params.set("view", next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div
      role="group"
      aria-label="Library view"
      className="flex items-center gap-0.5 rounded-full border border-zinc-700 p-0.5"
    >
      <button
        type="button"
        onClick={() => setView("grid")}
        aria-pressed={view === "grid"}
        aria-label="Grid view"
        title="Grid view"
        className={`flex h-8 w-8 items-center justify-center rounded-full ${
          view === "grid"
            ? "bg-zinc-800 text-orange-300"
            : "text-zinc-400 hover:text-zinc-200"
        }`}
      >
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
          <rect x="2.5" y="2.5" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.6" />
          <rect x="11.5" y="2.5" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.6" />
          <rect x="2.5" y="11.5" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.6" />
          <rect x="11.5" y="11.5" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => setView("list")}
        aria-pressed={view === "list"}
        aria-label="List view"
        title="List view"
        className={`flex h-8 w-8 items-center justify-center rounded-full ${
          view === "list"
            ? "bg-zinc-800 text-orange-300"
            : "text-zinc-400 hover:text-zinc-200"
        }`}
      >
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
          <rect x="2.5" y="3.5" width="15" height="3" rx="1" stroke="currentColor" strokeWidth="1.6" />
          <rect x="2.5" y="8.5" width="15" height="3" rx="1" stroke="currentColor" strokeWidth="1.6" />
          <rect x="2.5" y="13.5" width="15" height="3" rx="1" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </button>
    </div>
  );
}
