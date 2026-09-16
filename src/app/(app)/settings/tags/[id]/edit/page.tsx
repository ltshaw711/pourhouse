import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateTag } from "../../actions";
import { TagForm } from "../../TagForm";

export default async function EditTagPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: tag } = await supabase
    .from("tags")
    .select("*")
    .eq("id", id)
    .in("type", ["primary", "style"])
    .single();

  if (!tag) notFound();

  const updateThisTag = updateTag.bind(null, tag.id);

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <Link href="/settings/tags" className="text-sm text-zinc-400 hover:text-zinc-300">
        ← Tags
      </Link>
      <h1 className="mt-4 text-3xl font-semibold text-zinc-50">Edit tag</h1>
      <div className="mt-8">
        <TagForm
          action={updateThisTag}
          submitLabel="Save changes"
          initial={{
            name: tag.name,
            type: tag.type === "style" ? "style" : "primary",
          }}
        />
      </div>
    </main>
  );
}
