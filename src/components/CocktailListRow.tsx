import Link from "next/link";
import { gradientFor } from "@/lib/gradient";

type RowTag = { id: string; name: string };

// The list-view counterpart to CocktailCard: a much smaller thumbnail and
// a single row per cocktail so more of the library fits on screen at once.
export function CocktailListRow({
  id,
  name,
  photoUrl,
  primaryTags,
  styleTags,
  hrefBase = "/cocktails",
}: {
  id: string;
  name: string;
  photoUrl: string | null;
  primaryTags: RowTag[];
  styleTags: RowTag[];
  /** Lets the public /shared view link into its own read-only detail
   *  route instead of the authenticated /cocktails one. */
  hrefBase?: string;
}) {
  return (
    <Link
      href={`${hrefBase}/${id}`}
      className="group flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-2 pr-4 transition hover:border-zinc-600"
    >
      <div
        className={
          "h-12 w-12 shrink-0 rounded-md " +
          (photoUrl ? "bg-cover bg-center" : `bg-gradient-to-br ${gradientFor(id)}`)
        }
        style={photoUrl ? { backgroundImage: `url(${photoUrl})` } : undefined}
      />
      <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
        <h3 className="truncate font-medium text-zinc-50 group-hover:text-orange-300">
          {name}
        </h3>
        {(primaryTags.length > 0 || styleTags.length > 0) && (
          <div className="hidden shrink-0 flex-wrap justify-end gap-1.5 sm:flex">
            {primaryTags.map((tag) => (
              <span
                key={tag.id}
                className="rounded-full bg-orange-500/15 px-2 py-0.5 text-xs text-orange-300"
              >
                {tag.name}
              </span>
            ))}
            {styleTags.map((tag) => (
              <span
                key={tag.id}
                className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
