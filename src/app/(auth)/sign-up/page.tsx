import Link from "next/link";
import { signUpWithPassword, signInWithMagicLink } from "@/app/(auth)/actions";

// Sign up — PRD §6.1
export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { error, notice } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-50">
          Create your collection
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Every recipe you add stays private to your account.
        </p>
      </div>

      {error && (
        <p className="rounded-md border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-md border border-orange-900 bg-orange-950 px-3 py-2 text-sm text-orange-300">
          {notice}
        </p>
      )}

      <form action={signUpWithPassword} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-zinc-300">
          Email
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-50 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/40"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-300">
          Password
          <input
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-50 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/40"
          />
        </label>
        <button
          type="submit"
          className="mt-1 rounded-full bg-orange-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-orange-400"
        >
          Create account
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs text-zinc-400">
        <span className="h-px flex-1 bg-zinc-800" />
        or
        <span className="h-px flex-1 bg-zinc-800" />
      </div>

      <form action={signInWithMagicLink} className="flex flex-col gap-3">
        <input type="hidden" name="from" value="sign-up" />
        <label className="flex flex-col gap-1 text-sm text-zinc-300">
          Email
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-50 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/40"
          />
        </label>
        <button
          type="submit"
          className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-100 hover:border-zinc-500"
        >
          Email me a magic link instead
        </button>
      </form>

      <p className="text-center text-sm text-zinc-400">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-orange-400 hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
