/**
 * Fire-and-forget event tracking.
 * Never throws, never awaited — safe to call anywhere without try/catch.
 */
export function track(
  action: string,
  payload?: { boxId?: string; details?: Record<string, unknown> }
): void {
  // Only runs client-side; skip during SSR
  if (typeof window === "undefined") return;

  fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action,
      boxId: payload?.boxId,
      details: payload?.details
    })
  }).catch(() => {
    // Swallow all errors — analytics must not affect UX
  });
}

// ── Typed event helpers ────────────────────────────────────────────────────

/** Called when a user successfully completes a scan (QR or manual) */
export const trackScanSuccess = (boxId: string, method: "qr" | "manual") =>
  track("scan_success", { boxId, details: { method } });

/** Called when a box status is changed */
export const trackStatusChange = (boxId: string, from: string, to: string, source: "scan" | "detail" | "landing") =>
  track("status_change", { boxId, details: { from, to, source } });

/** Called when an item is added to a box */
export const trackItemAdd = (boxId: string, source: "detail" | "scan" | "landing") =>
  track("item_add", { boxId, details: { source } });

/** Called when a new box is created */
export const trackBoxCreate = (boxId: string, mode: "full" | "quick" = "full") =>
  track("box_create", { boxId, details: { mode } });

/** Called when user taps a one-tap quick create button */
export const trackQuickCreateTap = (room: string) =>
  track("quick_create_tap", { details: { room } });
