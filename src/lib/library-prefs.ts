// Cookie-based persistence for the Library's view/sort choice — a plain
// URL param alone only survives browser-history back/forward (see
// BackToLibraryLink), not a fresh navigation like clicking the nav bar's
// "Library" link, which carries no query string. ViewToggle/SortControl
// write these cookies whenever the visitor changes either; the Library
// page reads them server-side to fall back to the last choice when the
// URL doesn't specify one, redirecting once before any render so there's
// no flash of the wrong view first.
//
// Plain constants (no "use client"/"use server") so both sides import
// the same names/valid values instead of duplicating magic strings.

export const VIEW_COOKIE = "pourhouse_view";
export const SORT_COOKIE = "pourhouse_sort";

// A year — a browsing preference, not a session concern.
export const PREF_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type LibraryView = "grid" | "list";
export type LibrarySort = "newest" | "name-asc" | "name-desc" | "primary";

const VALID_VIEWS: readonly LibraryView[] = ["grid", "list"];
const VALID_SORTS: readonly LibrarySort[] = ["newest", "name-asc", "name-desc", "primary"];

export function isLibraryView(value: string | undefined): value is LibraryView {
  return !!value && (VALID_VIEWS as readonly string[]).includes(value);
}

export function isLibrarySort(value: string | undefined): value is LibrarySort {
  return !!value && (VALID_SORTS as readonly string[]).includes(value);
}
