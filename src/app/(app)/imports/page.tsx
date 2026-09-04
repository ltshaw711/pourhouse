import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createImportBatch } from "./actions";
import { UploadForm } from "./UploadForm";

// Imports — PRD §6.6 / §7: upload Apple Notes exports, then review each
// candidate before anything becomes a real cocktail.
export default async function ImportsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: batches } = await supabase
    .from("import_batches")
    .select("*")
    .order("uploaded_at", { ascending: false });

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-semibold text-zinc-50">Imports</h1>
      <p className="mt-1 max-w-prose text-sm text-zinc-400">
        Export a note (or a whole folder) from Apple Notes as Markdown —
        Share → Export as Markdown (.md) on Mac — then select the file(s)
        here. Nothing is added to your library until you review and
        confirm each one.
      </p>

      {error && (
        <p className="mt-4 rounded-md border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="mt-8">
        <UploadForm action={createImportBatch} />
      </div>

      {(batches ?? []).length > 0 && (
        <div className="mt-10">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-400">
            Past imports
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {(batches ?? []).map((batch) => (
              <li key={batch.id}>
                <Link
                  href={`/imports/${batch.id}`}
                  className="flex items-center justify-between rounded-md border border-zinc-800 px-3 py-2 text-sm hover:border-zinc-600"
                >
                  <span className="text-zinc-200">
                    {new Date(batch.uploaded_at).toLocaleString()}
                  </span>
                  <span className="text-zinc-400 capitalize">{batch.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
