// Home / Discover — PRD §7
// Search, ingredient chips, and featured/related recipes land here in a
// later phase. This is a structural placeholder for the Phase 1 scaffold.

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-start justify-center gap-4 px-6">
      <p className="text-sm font-medium uppercase tracking-wide text-orange-400">
        Pourhouse
      </p>
      <h1 className="text-4xl font-semibold text-zinc-50">
        Home / Discover
      </h1>
      <p className="max-w-prose text-zinc-400">
        Search, ingredient-chip discovery, and featured recipes arrive with
        the library build-out. This route is scaffolded per the information
        architecture in the PRD (§7).
      </p>
    </main>
  );
}
