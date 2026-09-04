// Sign in — PRD §6.1: email magic link or password

export default function SignInPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold text-zinc-50">Sign in</h1>
      <p className="mt-2 text-zinc-400">
        Email magic link and password sign-in wire up once Supabase Auth is
        connected.
      </p>
    </main>
  );
}
