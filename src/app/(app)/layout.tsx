import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";

// Shared shell for the authenticated app area — PRD §7 IA, §8 mobile-first
// nav ("search and add actions remain visible on small screens"). The proxy
// (src/proxy.ts) already guarantees a signed-in user reaches this layout.
//
// Three independently-shrinking groups (logo / links / actions), each
// `shrink-0` where it must never wrap or truncate, so nothing overlaps
// down to a phone-width viewport — Library and Add cocktail stay reachable
// even when Imports/Settings and the Sign out label give way first.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950">
      <nav className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="shrink-0 text-lg font-semibold text-zinc-50">
            Pourhouse
          </Link>

          <div className="flex min-w-0 items-center gap-4 overflow-x-auto text-sm text-zinc-400">
            <Link href="/library" className="shrink-0 hover:text-zinc-50">
              Library
            </Link>
            <Link
              href="/imports"
              className="hidden shrink-0 hover:text-zinc-50 sm:inline"
            >
              Imports
            </Link>
            <Link
              href="/settings"
              className="hidden shrink-0 hover:text-zinc-50 sm:inline"
            >
              Settings
            </Link>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <Link
              href="/cocktails/new"
              aria-label="Add cocktail"
              className="flex items-center gap-1 rounded-full bg-orange-500 px-3 py-1.5 text-sm font-medium text-zinc-950 hover:bg-orange-400"
            >
              <span aria-hidden>+</span>
              <span className="hidden sm:inline">Add cocktail</span>
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="text-sm text-zinc-400 hover:text-zinc-50"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </nav>
      {children}
    </div>
  );
}
