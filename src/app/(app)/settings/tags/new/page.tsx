import Link from "next/link";
import { createTag } from "../actions";
import { TagForm } from "../TagForm";

export default function NewTagPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <Link href="/settings/tags" className="text-sm text-zinc-400 hover:text-zinc-300">
        ← Tags
      </Link>
      <h1 className="mt-4 text-3xl font-semibold text-zinc-50">Add tag</h1>
      <div className="mt-8">
        <TagForm action={createTag} submitLabel="Add tag" />
      </div>
    </main>
  );
}
