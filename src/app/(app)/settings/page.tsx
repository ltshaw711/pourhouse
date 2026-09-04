import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DeleteAccountForm } from "./DeleteAccountForm";

// Settings — PRD §7 / §11: profile, data export, and account deletion.
export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-semibold text-zinc-50">Settings</h1>

      <section className="mt-8">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-400">
          Account
        </h2>
        <p className="mt-2 text-zinc-300">{user?.email}</p>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-400">
          Ingredients
        </h2>
        <p className="mt-2 max-w-prose text-sm text-zinc-400">
          Manage the canonical ingredient list — what shows up on the
          &ldquo;What can you make?&rdquo; page and what a recipe&rsquo;s
          ingredients can link to.
        </p>
        <Link
          href="/settings/ingredients"
          className="mt-3 inline-block rounded-full border border-zinc-700 px-4 py-1.5 text-sm text-zinc-200 hover:border-zinc-500"
        >
          Manage ingredients
        </Link>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-400">
          Your data
        </h2>
        <p className="mt-2 max-w-prose text-sm text-zinc-400">
          Download every cocktail in your collection — ingredients, tags,
          instructions, and notes — as a JSON file you keep for yourself.
        </p>
        <a
          href="/settings/export"
          className="mt-3 inline-block rounded-full border border-zinc-700 px-4 py-1.5 text-sm text-zinc-200 hover:border-zinc-500"
        >
          Export my data
        </a>
      </section>

      <section className="mt-10 rounded-lg border border-red-900 p-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-red-400">
          Danger zone
        </h2>
        <p className="mt-2 max-w-prose text-sm text-zinc-400">
          Permanently deletes your account and every cocktail, ingredient,
          and tag you own. This can&rsquo;t be undone — export your data
          first if you want to keep a copy.
        </p>
        <DeleteAccountForm />
      </section>
    </main>
  );
}
