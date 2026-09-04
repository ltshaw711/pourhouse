import Link from "next/link";
import { gradientFor } from "@/lib/gradient";

type CardTag = { id: string; name: string };

export function CocktailCard({
  id,
  name,
  photoUrl,
  primaryTags,
  styleTags,
}: {
  id: string;
  name: string;
  photoUrl: string | null;
  primaryTags: CardTag[];
  styleTags: CardTag[];
}) {
  return (
    <Link
      href={`/cocktails/${id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 transition hover:border-zinc-600"
    >
      <div
        className={
          photoUrl
            ? "aspect-square bg-cover bg-center"
            : `aspect-square bg-gradient-to-br ${gradientFor(id)}`
        }
        style={photoUrl ? { backgroundImage: `url(${photoUrl})` } : undefined}
      />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-medium text-zinc-50 group-hover:text-orange-300">
          {name}
        </h3>
        {(primaryTags.length > 0 || styleTags.length > 0) && (
          <div className="flex flex-wrap gap-1.5">
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
