import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Magic-link emails and signup-confirmation emails both redirect here with
// a `code` param. We exchange it for a real session, then send the user on.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/sign-in?error=${encodeURIComponent(
      "That link is invalid or has expired. Please try again."
    )}`
  );
}
