import Link from "next/link";

// Shared shell for the authenticated app area — PRD §7 IA, §8 mobile-first
// nav ("search and add actions remain visible on small screens").
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-950">
      <nav className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-zinc-950/90 px-6 py-4 backdrop-blur">
        <Link href="/" className="text-lg font-semibold text-zinc-50">
          Pourhouse
        </Link>
        <div className="flex items-center gap-6 text-sm text-zinc-400">
          <Link href="/library" className="hover:text-zinc-50">
            Library
          </Link>
          <Link href="/imports" className="hover:text-zinc-50">
            Imports
          </Link>
          <Link href="/settings" className="hover:text-zinc-50">
            Settings
          </Link>
          <Link
            href="/cocktails/new"
            className="rounded-full bg-orange-500 px-4 py-1.5 font-medium text-zinc-950 hover:bg-orange-400"
          >
            Add cocktail
          </Link>
        </div>
      </nav>
      {children}
    </div>
  );
}
