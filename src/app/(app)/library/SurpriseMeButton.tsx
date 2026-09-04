"use client";

import { useRouter } from "next/navigation";

// PRD §6.3: picks a cocktail from the *currently filtered* set — the
// page already computed that list server-side, so it's just passed in.
export function SurpriseMeButton({ cocktailIds }: { cocktailIds: string[] }) {
  const router = useRouter();

  if (cocktailIds.length === 0) return null;

  return (
    <button
      type="button"
      onClick={() => {
        const id = cocktailIds[Math.floor(Math.random() * cocktailIds.length)];
        router.push(`/cocktails/${id}`);
      }}
      className="shrink-0 rounded-full border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-zinc-500"
    >
      🎲 Surprise me
    </button>
  );
}
