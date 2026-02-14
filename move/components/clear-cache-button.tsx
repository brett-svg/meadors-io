"use client";

import { useState } from "react";

export function ClearCacheButton() {
  const [done, setDone] = useState(false);

  async function clearCache() {
    // Tell service worker to clear its caches
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage("clearCache");
    }
    // Also clear via Cache API directly from the page
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  }

  return (
    <button
      className="btn text-xs text-slate-400"
      style={{ padding: "0.25rem 0.6rem" }}
      onClick={clearCache}
    >
      {done ? "✓ Cleared" : "🗑️ Clear Cache"}
    </button>
  );
}
