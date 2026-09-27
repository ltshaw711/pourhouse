import { gradientFor } from "@/lib/gradient";

// Detail-page hero image — deliberately different from CocktailCard/
// CocktailListRow's small cropped thumbnails, which are supposed to be
// uniform crops for a browsing grid. Here the whole photo matters: no
// aspect-ratio box forcing a crop, just the image at its own natural
// shape, capped only by a max height so a tall portrait doesn't run off
// the page. A plain <img> rather than next/image — nothing else in this
// app uses next/image (no remote-pattern config for the Supabase
// Storage host, and its width/height props want a known intrinsic size,
// which a user-uploaded photo doesn't have one of ahead of time; a
// browser-native img already does natural aspect-ratio scaling for free
// with just max-width/max-height).
export function CocktailPhoto({
  id,
  name,
  photoUrl,
}: {
  id: string;
  name: string;
  photoUrl: string | null;
}) {
  if (!photoUrl) {
    return (
      <div
        className={`mt-4 aspect-[3/1] rounded-xl bg-gradient-to-br ${gradientFor(id)}`}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photoUrl}
      alt={name}
      className="mx-auto mt-4 block max-h-[500px] max-w-full rounded-xl"
    />
  );
}
