"use server";

// Server Actions: functions that run only on the server but are called
// directly from a <form action={...}>, no separate API route needed.
// PRD §6.1: email magic link or password sign-in.

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function siteUrl() {
  // NEXT_PUBLIC_SITE_URL is authoritative (set per environment); falling
  // back to the request's own origin keeps local dev working without it.
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
}

export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/sign-in?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/");
}

export async function signUpWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${await siteUrl()}/auth/callback` },
  });

  if (error) {
    redirect(`/sign-up?error=${encodeURIComponent(error.message)}`);
  }

  if (!data.session) {
    // Email confirmation is required before a session exists — the
    // dashboard's "Confirm email" setting controls this (see README).
    redirect(
      `/sign-up?notice=${encodeURIComponent(
        "Check your email to confirm your account, then sign in."
      )}`
    );
  }

  redirect("/");
}

export async function signInWithMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const from = String(formData.get("from") ?? "sign-in");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${await siteUrl()}/auth/callback` },
  });

  if (error) {
    redirect(`/${from}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(
    `/${from}?notice=${encodeURIComponent(
      "Check your email for a sign-in link."
    )}`
  );
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}
