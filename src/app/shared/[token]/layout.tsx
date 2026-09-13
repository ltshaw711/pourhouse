import Link from "next/link";

// Public read-only share view — a sibling of (app)/(auth), not nested
// under either, so it gets none of the authenticated nav/sign-out chrome
// and skips the sign-in gate (src/proxy.ts allow-lists "/shared").
export default function SharedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="border-b border-zinc-800 bg-zinc-900/60 px-4 py-2 text-center text-xs text-zinc-400">
        Read-only shared view —{" "}
        <Link href="/" className="underline hover:text-zinc-200">
          Pourhouse
        </Link>
      </div>
      {children}
    </div>
  );
}
