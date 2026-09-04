// Deterministic citrus/berry gradient per cocktail (PRD §8), used as the
// card treatment until a real photo is uploaded (photo upload lands with
// Supabase Storage in a later phase).
const GRADIENTS = [
  "from-orange-500/50 to-pink-600/50",
  "from-amber-500/50 to-rose-600/50",
  "from-rose-500/50 to-purple-600/50",
  "from-orange-400/50 to-red-600/50",
  "from-pink-500/50 to-orange-600/50",
  "from-amber-400/50 to-pink-600/50",
];

export function gradientFor(seed: string): string {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return GRADIENTS[hash % GRADIENTS.length];
}
