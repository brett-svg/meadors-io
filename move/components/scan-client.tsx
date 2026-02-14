"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

// @zxing/browser works on iOS Safari, Firefox, and Chrome.
// BarcodeDetector is Chrome/Edge desktop only — not reliable for mobile.
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { trackScanSuccess, trackStatusChange, trackItemAdd } from "@/lib/analytics/track";

type ScannerState = "starting" | "running" | "blocked";

interface BoxData {
  id: string;
  shortCode: string;
  roomCode: string;
  room: string;
  zone?: string | null;
  status: string;
  fragile: boolean;
  priority: string;
  items: Array<{ id: string; name: string; qty: number }>;
}

interface UndoState {
  box: BoxData;
  previousStatus: string;
  label: string;
}

const STATUS_LABEL: Record<string, string> = {
  draft: "✏️ Draft",
  packed: "📦 Packed",
  in_transit: "🚛 In Transit",
  delivered: "✅ Delivered",
  unpacked: "🏠 Unpacked"
};

const STATUS_CSS: Record<string, string> = {
  draft: "status-draft",
  packed: "status-packed",
  in_transit: "status-transit",
  delivered: "status-delivered",
  unpacked: "status-unpacked"
};

export function ScanClient() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lastScannedRef = useRef<string>("");
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [scanState, setScanState] = useState<ScannerState>("starting");
  const [box, setBox] = useState<BoxData | null>(null);
  const [flash, setFlash] = useState<{ message: string } | null>(null);
  const [undo, setUndo] = useState<UndoState | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [quickItem, setQuickItem] = useState("");
  const [itemSaving, setItemSaving] = useState(false);
  const [deliveredCount, setDeliveredCount] = useState(0);

  // ── scanner bootstrap ──────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;

    async function start() {
      try {
        const reader = new BrowserQRCodeReader(undefined, {
          delayBetweenScanAttempts: 400
        });
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current!,
          (result) => {
            if (!result || !active) return;
            const value = result.getText();
            // debounce: ignore re-scans of the same code for 3 s
            if (value === lastScannedRef.current) return;
            lastScannedRef.current = value;
            setTimeout(() => { lastScannedRef.current = ""; }, 3000);
            lookup(value);
          }
        );
        if (active) {
          controlsRef.current = controls;
          setScanState("running");
        } else {
          controls.stop();
        }
      } catch {
        if (active) setScanState("blocked");
      }
    }

    start();
    return () => {
      active = false;
      controlsRef.current?.stop();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── core lookup ────────────────────────────────────────────────────────────
  const lookup = useCallback(async (value: string) => {
    const res = await fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value })
    });
    if (!res.ok) return;
    const data: BoxData = await res.json();
    navigator.vibrate?.(80);
    trackScanSuccess(data.id, value.startsWith("http") ? "qr" : "manual");

    // WOW: auto-advance in_transit → delivered with undo
    if (data.status === "in_transit") {
      await autoDeliver(data);
    } else {
      setBox(data);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── auto-deliver with undo ─────────────────────────────────────────────────
  async function autoDeliver(scannedBox: BoxData) {
    const res = await fetch(`/api/boxes/${scannedBox.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...scannedBox, status: "delivered" })
    });
    if (!res.ok) {
      setBox(scannedBox);
      return;
    }
    const updated: BoxData = await res.json();
    navigator.vibrate?.([60, 40, 160]);
    setDeliveredCount((c) => c + 1);
    triggerFlash(`✅ ${scannedBox.roomCode} delivered`);
    trackStatusChange(scannedBox.id, "in_transit", "delivered", "scan");

    // offer undo for 4 s
    const undoState: UndoState = { box: updated, previousStatus: "in_transit", label: scannedBox.roomCode };
    setUndo(undoState);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => setUndo(null), 4000);
  }

  // ── manual status change ───────────────────────────────────────────────────
  async function quickStatus(status: string) {
    if (!box) return;
    const prev = box.status;
    const res = await fetch(`/api/boxes/${box.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...box, status })
    });
    if (!res.ok) return;
    const updated: BoxData = await res.json();
    navigator.vibrate?.([60, 40, 160]);
    if (status === "delivered") setDeliveredCount((c) => c + 1);
    triggerFlash(`${STATUS_LABEL[status]} — ${box.roomCode}`);
    trackStatusChange(box.id, prev, status, "scan");

    const undoState: UndoState = { box: updated, previousStatus: prev, label: box.roomCode };
    setUndo(undoState);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => setUndo(null), 4000);
    setBox(null);
  }

  // ── undo ──────────────────────────────────────────────────────────────────
  async function handleUndo() {
    if (!undo) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndo(null);
    const res = await fetch(`/api/boxes/${undo.box.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...undo.box, status: undo.previousStatus })
    });
    if (res.ok) {
      const restored: BoxData = await res.json();
      setBox(restored);
      if (undo.previousStatus !== "delivered") setDeliveredCount((c) => Math.max(0, c - 1));
    }
  }

  // ── quick-add item ─────────────────────────────────────────────────────────
  async function addItem() {
    if (!box || !quickItem.trim()) return;
    setItemSaving(true);
    const res = await fetch(`/api/boxes/${box.id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: quickItem.trim(), qty: 1, packed: true, tags: [] })
    });
    if (res.ok) {
      const items = await res.json();
      setBox({ ...box, items });
      setQuickItem("");
      trackItemAdd(box.id, "scan");
    }
    setItemSaving(false);
  }

  // ── flash helper ──────────────────────────────────────────────────────────
  function triggerFlash(message: string) {
    setFlash({ message });
    setTimeout(() => setFlash(null), 1400);
  }

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Full-screen success flash */}
      {flash && (
        <div
          className="scan-flash"
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            background: "linear-gradient(135deg, #059669, #10b981)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            color: "white", gap: "0.5rem"
          }}
          aria-live="assertive"
        >
          <span style={{ fontSize: "3.5rem" }}>✅</span>
          <span style={{ fontSize: "1.3rem", fontWeight: 700 }}>{flash.message}</span>
          {deliveredCount > 1 && (
            <span style={{ fontSize: "0.9rem", opacity: 0.85 }}>{deliveredCount} boxes delivered this session</span>
          )}
        </div>
      )}

      {/* Undo toast */}
      {undo && (
        <div className="undo-toast" role="status" aria-live="polite">
          <span>{undo.label} status changed</span>
          <button onClick={handleUndo}>Undo</button>
        </div>
      )}

      {/* Header */}
      <section className="card p-4">
        <h1 className="text-xl font-semibold">Scan a Box</h1>
        <p className="text-sm text-slate-500 mt-1">
          {scanState === "running"
            ? "Point at a QR label — in-transit boxes are auto-delivered"
            : scanState === "blocked"
            ? "Camera unavailable — enter the short code below"
            : "Starting camera…"}
        </p>
        {deliveredCount > 0 && (
          <div className="mt-2 text-sm font-medium text-emerald-700">
            {deliveredCount} box{deliveredCount !== 1 ? "es" : ""} delivered this session
          </div>
        )}
      </section>

      {/* Camera + manual input */}
      <section className="card overflow-hidden">
        <video
          ref={videoRef}
          muted
          playsInline
          aria-label="QR code scanner camera"
          className="w-full bg-black"
          style={{ maxHeight: 280, display: scanState === "blocked" ? "none" : "block" }}
        />
        <div className="p-3 flex gap-2">
          <input
            className="field"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { lookup(manualCode); setManualCode(""); } }}
            placeholder={scanState === "blocked" ? "Enter short code (e.g. BX-001234)" : "Or type a short code"}
            aria-label="Manual short code entry"
            autoFocus={scanState === "blocked"}
          />
          <button
            className="btn btn-primary"
            onClick={() => { lookup(manualCode); setManualCode(""); }}
          >
            Go
          </button>
        </div>
      </section>

      {/* Scanned box card */}
      {box && !flash && (
        <section className="card p-4 space-y-3" aria-label="Scanned box">
          {/* Box identity */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xl">{box.roomCode}</span>
                {box.fragile && <span className="fragile-badge">⚠️ Fragile</span>}
                {box.priority === "high" && (
                  <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                    High priority
                  </span>
                )}
              </div>
              <div className="text-sm text-slate-500 mt-0.5">
                {box.room}{box.zone ? ` · ${box.zone}` : ""} · {box.shortCode}
              </div>
            </div>
            <span className={`status-badge ${STATUS_CSS[box.status] ?? "status-draft"}`}>
              {STATUS_LABEL[box.status] ?? box.status}
            </span>
          </div>

          {/* Items preview */}
          {box.items.length > 0 && (
            <div className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
              {box.items.slice(0, 4).map((i) => i.name).join(", ")}
              {box.items.length > 4 && ` +${box.items.length - 4} more`}
            </div>
          )}

          {/* Primary action — large tap target */}
          {box.status !== "delivered" && box.status !== "unpacked" && (
            <button
              className="btn btn-success w-full"
              style={{ padding: "0.85rem", fontSize: "1.05rem" }}
              onClick={() => quickStatus("delivered")}
            >
              ✅ Mark as Delivered
            </button>
          )}
          {box.status === "delivered" && (
            <button
              className="btn btn-primary w-full"
              style={{ padding: "0.85rem", fontSize: "1.05rem" }}
              onClick={() => quickStatus("unpacked")}
            >
              🏠 Mark as Unpacked
            </button>
          )}
          {box.status === "unpacked" && (
            <div className="text-center text-sm text-emerald-700 font-medium py-2">
              Already unpacked 🎉
            </div>
          )}

          {/* Inline quick-add item — no prompt() */}
          <div className="flex gap-2 border-t border-slate-100 pt-3">
            <input
              className="field text-sm"
              placeholder="Add an item to this box…"
              value={quickItem}
              onChange={(e) => setQuickItem(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addItem(); }}
              aria-label="Quick add item to box"
            />
            <button
              className="btn text-sm"
              onClick={addItem}
              disabled={itemSaving || !quickItem.trim()}
            >
              {itemSaving ? "…" : "Add"}
            </button>
          </div>

          {/* Open full detail */}
          <Link
            href={`/boxes/${box.id}`}
            className="btn block text-center text-sm"
            style={{ color: "#0369a1" }}
          >
            Open full detail →
          </Link>
        </section>
      )}

      {/* "Scan next" prompt after action */}
      {!box && !flash && deliveredCount > 0 && (
        <div
          className="card p-4 text-center"
          style={{ background: "#f0fdf4", borderColor: "#bbf7d0" }}
        >
          <div className="text-emerald-700 font-semibold">Ready for next box</div>
          <div className="text-sm text-slate-500 mt-1">
            {deliveredCount} box{deliveredCount !== 1 ? "es" : ""} delivered this session
          </div>
        </div>
      )}
    </div>
  );
}
