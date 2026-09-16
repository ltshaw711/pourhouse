import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { deleteTag } from "./actions";
import { DeleteTagButton } from "./DeleteTagButton";

// Primary/style tag management — the taxonomy behind the orange/zinc
// badges on every cocktail card, the Library's tag filter chips, and the
// "Primary ingredient" sort. Previously SQL-only, seeded via
// 0002_seed_taxonomy.sql.
export default async function TagsPage() {
  const supabase = await createClient();
  const { data: tags } = await supabase
    .from("tags")
    .select("id, name, type")
    .in("type", ["primary", "style"])
    .order("name");

  const rows = tags ?? [];
  const primaryTags = rows.filter((t) => t.type === "primary");
  const styleTags = rows.filter((t) => t.type === "style");

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/settings" className="text-sm text-zinc-400 hover:text-zinc-300">
        ← Settings
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold text-zinc-50">Tags</h1>
        <Link
          href="/settings/tags/new"
          className="rounded-full bg-orange-500 px-4 py-1.5 text-sm font-medium text-zinc-950 hover:bg-orange-400"
        >
          Add tag
        </Link>
      </div>
      <p className="mt-2 max-w-prose text-sm text-zinc-400">
        Primary tags are the base spirit/category badge shown on every
        cocktail (and what &ldquo;Sort by primary ingredient&rdquo; groups
        by) — add one here, then check it in a recipe&rsquo;s Edit form to
        apply it. Style tags are the secondary descriptors (Classic, Tiki,
        Stirred…).
      </p>

      <TagSection title="Primary tags" rows={primaryTags} />
      <TagSection title="Style tags" rows={styleTags} />
    </main>
  );
}

function TagSection({
  title,
  rows,
}: {
  title: string;
  rows: { id: string; name: string }[];
}) {
  return (
    <section className="mt-10">
      <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-400">
        {title}
      </h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-400">None yet.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {rows.map((tag) => (
            <li
              key={tag.id}
              className="flex items-center justify-between gap-3 rounded-md border border-zinc-800 px-4 py-3"
            >
              <p className="min-w-0 truncate text-zinc-100">{tag.name}</p>
              <div className="flex shrink-0 items-center gap-3">
                <Link
                  href={`/settings/tags/${tag.id}/edit`}
                  className="text-sm text-zinc-400 hover:text-zinc-200"
                >
                  Edit
                </Link>
                <DeleteTagButton action={deleteTag.bind(null, tag.id)} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
