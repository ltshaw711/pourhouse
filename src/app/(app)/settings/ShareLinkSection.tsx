"use client";

import { useEffect, useState } from "react";
import { regenerateShareLink, disableSharing } from "./actions";

// Renders the full URL from window.location.origin so the same code
// works in local dev and at the production domain without a hardcoded
// site-URL env var. Origin is only known client-side, so it's read in an
// effect rather than during render — computing it inline would make the
// server-rendered markup (relative path) mismatch the first client
// render (absolute URL) and trip a hydration warning.
export function ShareLinkSection({ shareToken }: { shareToken: string | null }) {
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    // A lazy useState initializer would run on the client during hydration
    // too (window exists there), producing the real origin immediately and
    // mismatching the server-rendered empty string from this same render
    // pass — this effect is what keeps the first client render identical
    // to the server's before filling the real value in.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(window.location.origin);
  }, []);

  const shareUrl = shareToken ? `${origin}/shared/${shareToken}` : "";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied by the browser — the link is still
      // selectable text in the input, so this isn't a dead end.
    }
  }

  if (!shareToken) {
    return (
      <div className="mt-3">
        <p className="max-w-prose text-sm text-zinc-400">
          Sharing is off. Turning it on creates a link that shows your
          published cocktails, read-only, to anyone who has it — no
          sign-in required.
        </p>
        <form action={regenerateShareLink} className="mt-3">
          <button
            type="submit"
            className="rounded-full border border-zinc-700 px-4 py-1.5 text-sm text-zinc-200 hover:border-zinc-500"
          >
            Enable public link
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-col gap-3">
      <p className="max-w-prose text-sm text-zinc-400">
        Anyone with this link can view your published cocktails — no
        sign-in required. It stays valid until you regenerate or turn it
        off.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          readOnly
          value={shareUrl}
          aria-label="Public share link"
          onFocus={(e) => e.currentTarget.select()}
          className="w-full max-w-sm rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/40"
        />
        <button
          type="button"
          onClick={copyLink}
          className="shrink-0 rounded-full border border-zinc-700 px-4 py-1.5 text-sm text-zinc-200 hover:border-zinc-500"
        >
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <form action={regenerateShareLink}>
          <button
            type="submit"
            className="rounded-full border border-zinc-700 px-4 py-1.5 text-sm text-zinc-200 hover:border-zinc-500"
          >
            Regenerate link
          </button>
        </form>
        <form action={disableSharing}>
          <button
            type="submit"
            className="text-sm text-zinc-400 hover:text-red-400"
          >
            Turn off sharing
          </button>
        </form>
      </div>
    </div>
  );
}
