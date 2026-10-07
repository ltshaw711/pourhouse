"use client";

import { useEffect } from "react";

// Renders nothing; just flags in sessionStorage that this tab has shown
// the library, so BackToLibraryLink (with the matching `visitedKey`) on a
// drink's page knows the previous history entry really is the library
// and can safely go back to it. sessionStorage rather than localStorage
// because it's per-tab and dies with the tab — exactly the lifetime the
// "previous entry is the library" claim has.
export function RememberLibraryVisit({ storageKey }: { storageKey: string }) {
  useEffect(() => {
    try {
      window.sessionStorage.setItem(storageKey, "1");
    } catch {
      // Blocked storage just means the back link takes its fallback route.
    }
  }, [storageKey]);

  return null;
}
