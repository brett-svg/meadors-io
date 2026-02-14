"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { enqueueWrite, flushQueue } from "@/lib/pwa/queue";

const LABEL_OPTIONS = [
  { id: "4x6-inch-(inventory)", template: "inventory_4x6", label: "4×6 Inventory (default)" },
  { id: "generic-2x3-inch",     template: "standard_inventory", label: "2×3 Standard" },
  { id: "avery-5160",           template: "standard_inventory", label: "Avery 5160 Sheet" },
];
const DEFAULT_LABEL_KEY = "move:defaultLabelIdx";

const STATUS_OPTIONS = [
  { value: "draft",      label: "Draft",      icon: "✏️" },
  { value: "packed",     label: "Packed",      icon: "📦" },
  { value: "in_transit", label: "In Transit",  icon: "🚛" },
  { value: "delivered",  label: "Delivered",   icon: "✅" },
  { value: "unpacked",   label: "Unpacked",    icon: "🏠" }
];

function statusClass(s: string) {
  const map: Record<string, string> = {
    draft: "status-draft",
    packed: "status-packed",
    in_transit: "status-transit",
    delivered: "status-delivered",
    unpacked: "status-unpacked"
  };
  return map[s] ?? "status-draft";
}

export function BoxDetailClient({ initialBox }: { initialBox: any }) {
  const normalizeBox = (value: any) => ({
    ...value,
    items: Array.isArray(value?.items) ? value.items : [],
    photos: Array.isArray(value?.photos) ? value.photos : []
  });

  const [box, setBox] = useState(normalizeBox(initialBox));
  const [itemName, setItemName] = useState("");
  const [bulkInput, setBulkInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [showPrintMenu, setShowPrintMenu] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [defaultLabelIdx, setDefaultLabelIdx] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return Number(localStorage.getItem(DEFAULT_LABEL_KEY) ?? 0);
  });
  const printMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (printMenuRef.current && !printMenuRef.current.contains(e.target as Node)) {
        setShowPrintMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function labelUrl(idx: number) {
    const opt = LABEL_OPTIONS[idx];
    return `/api/exports/label/${box.id}?template=${opt.template}&labelSizeId=${opt.id}`;
  }

  function openPreview(idx: number) {
    const opt = LABEL_OPTIONS[idx];
    // PNG at low DPI for fast preview (GET endpoint)
    setPreviewUrl(`/api/exports/png?boxId=${box.id}&template=${opt.template}&labelSizeId=${opt.id}&dpi=96`);
    setShowPrintMenu(false);
  }

  function printUrl(previewPngUrl: string) {
    // Derive the PDF print URL from the preview PNG URL params
    const u = new URL(previewPngUrl, "http://x");
    const template = u.searchParams.get("template") ?? "inventory_4x6";
    const labelSizeId = u.searchParams.get("labelSizeId") ?? "4x6-inch-(inventory)";
    return `/api/exports/label/${box.id}?template=${template}&labelSizeId=${labelSizeId}`;
  }

  function setDefault(idx: number) {
    setDefaultLabelIdx(idx);
    localStorage.setItem(DEFAULT_LABEL_KEY, String(idx));
  }

  const qrUrl = useMemo(() => {
    if (typeof window === "undefined") return `/box/${box.shortCode}`;
    return `${window.location.origin}/box/${box.shortCode}`;
  }, [box.shortCode]);

  const currentStatus = STATUS_OPTIONS.find((s) => s.value === box.status);

  async function patchBox(patch: Record<string, unknown>) {
    setSaving(true);
    const payload = { ...box, ...patch };
    try {
      const res = await fetch(`/api/boxes/${box.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const updated = await res.json();
        setBox((prev: any) => normalizeBox({
          ...prev,
          ...updated,
          items: updated?.items ?? prev?.items,
          photos: updated?.photos ?? prev?.photos
        }));
      }
    } catch {
      enqueueWrite({
        id: crypto.randomUUID(),
        url: `/api/boxes/${box.id}`,
        method: "PATCH",
        body: JSON.stringify(payload)
      });
    } finally {
      setSaving(false);
    }
  }

  async function addItem() {
    if (!itemName.trim()) return;
    const payload = { name: itemName, qty: 1, packed: true, tags: [] };
    try {
      const res = await fetch(`/api/boxes/${box.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setBox({ ...box, items: await res.json() });
        setItemName("");
      }
    } catch {
      enqueueWrite({
        id: crypto.randomUUID(),
        url: `/api/boxes/${box.id}/items`,
        method: "POST",
        body: JSON.stringify(payload)
      });
      setItemName("");
    }
  }

  async function addBulk() {
    const res = await fetch(`/api/boxes/${box.id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bulkInput })
    });
    if (res.ok) {
      setBox({ ...box, items: await res.json() });
      setBulkInput("");
      setShowBulk(false);
    }
  }

  async function removeItem(id: string) {
    const res = await fetch(`/api/boxes/${box.id}/items`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    if (res.ok) setBox({ ...box, items: await res.json() });
  }

  async function uploadPhoto(file: File | null) {
    if (!file) return;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const res = await fetch(`/api/boxes/${box.id}/photos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64Image: dataUrl })
    });
    if (res.ok) {
      const photo = await res.json();
      if (photo.warning) alert(photo.warning);
      setBox({ ...box, photos: [...(box.photos || []), photo] });
    }
  }

  return (
    <div className="space-y-4">
      {/* Box header */}
      <section className="card p-4">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold">{box.roomCode}</h1>
              {box.fragile && <span className="fragile-badge">⚠️ Fragile</span>}
            </div>
            <div className="text-slate-500 text-sm">{box.shortCode}</div>
            <div className="text-sm mt-1 text-slate-600">
              {[box.house, box.floor, box.room, box.zone].filter(Boolean).join(" › ")}
            </div>
            <div className="mt-2 text-xs text-slate-400">
              QR: <code className="bg-slate-100 px-1 rounded">{qrUrl}</code>
            </div>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <span className={`status-badge ${statusClass(box.status)}`} style={{ fontSize: "0.85rem", padding: "0.3rem 0.8rem" }}>
              {currentStatus?.icon} {currentStatus?.label}
            </span>
            {/* Print button + dropdown */}
            <div className="relative" ref={printMenuRef}>
              <div style={{ display: "flex", borderRadius: "0.5rem", overflow: "hidden" }}>
                <a
                  href={labelUrl(defaultLabelIdx)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary text-sm"
                  style={{ padding: "0.45rem 0.9rem", borderRadius: 0, borderRight: "1px solid rgba(255,255,255,0.2)", flex: 1, whiteSpace: "nowrap" }}
                >
                  🏷️ Print Label
                </a>
                <button
                  className="btn btn-primary text-sm"
                  style={{ padding: "0.45rem 0.65rem", borderRadius: 0, minWidth: 0 }}
                  onClick={() => setShowPrintMenu(v => !v)}
                  aria-label="Label options"
                >
                  ▾
                </button>
              </div>
              {showPrintMenu && (
                <div className="absolute right-0 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide border-b border-slate-100">
                    Label Size
                  </div>
                  {LABEL_OPTIONS.map((opt, idx) => (
                    <div key={opt.id} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50">
                      <button
                        className="flex-1 text-left text-sm text-slate-700"
                        onClick={() => { openPreview(idx); }}
                      >
                        {idx === defaultLabelIdx && <span className="text-sky-500 mr-1">✓</span>}
                        {opt.label}
                      </button>
                      <button
                        className="text-xs text-slate-400 hover:text-sky-600"
                        title="Set as default"
                        onClick={() => setDefault(idx)}
                      >
                        {idx === defaultLabelIdx ? "default" : "set default"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              className="btn text-xs text-slate-400"
              style={{ padding: "0.25rem 0.6rem" }}
              onClick={() => flushQueue()}
            >
              ↑ Sync offline
            </button>
          </div>
        </div>
      </section>

      {/* Status update */}
      <section className="card p-4">
        <h2 className="font-semibold mb-3">Update Status</h2>
        <div className="flex flex-wrap gap-2 mb-3">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`btn ${box.status === opt.value ? "btn-primary" : ""}`}
              onClick={() => patchBox({ status: opt.value })}
              disabled={saving}
            >
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>
        {/* Quick prominent actions */}
        <div className="flex gap-2 flex-wrap">
          {box.status !== "delivered" && (
            <button
              className="btn btn-success"
              onClick={() => patchBox({ status: "delivered" })}
              disabled={saving}
            >
              ✅ Mark as Delivered
            </button>
          )}
          {box.status === "delivered" && (
            <button
              className="btn btn-primary"
              onClick={() => patchBox({ status: "unpacked" })}
              disabled={saving}
            >
              🏠 Mark as Unpacked
            </button>
          )}
        </div>
      </section>

      {/* Inventory */}
      <section className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Items ({box.items.length})</h2>
          <button
            className="btn text-sm"
            onClick={() => setShowBulk((v) => !v)}
          >
            {showBulk ? "Single item" : "Add multiple"}
          </button>
        </div>

        {showBulk ? (
          <div className="space-y-2">
            <div className="text-xs text-slate-500 mb-1">One item per line, e.g. <em>plates x 8</em> or <em>usb cable (3)</em></div>
            <textarea
              className="field"
              rows={4}
              placeholder={"plates x 8\nusb cable (3)\ntoothbrush"}
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              autoFocus
            />
            <button className="btn btn-primary" onClick={addBulk}>Add Items</button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              className="field"
              placeholder="Item name (e.g. plates, charger)"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addItem(); }}
              autoFocus
            />
            <button className="btn btn-primary" onClick={addItem}>Add</button>
          </div>
        )}

        <div className="mt-3 space-y-1.5">
          {box.items.length === 0 ? (
            <div className="text-sm text-slate-400 text-center py-4">No items yet — add some above</div>
          ) : (
            box.items.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{item.name}</span>
                  {item.qty > 1 && (
                    <span className="text-xs font-semibold bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full">×{item.qty}</span>
                  )}
                </div>
                <button
                  className="btn btn-danger text-xs"
                  style={{ padding: "0.2rem 0.5rem" }}
                  onClick={() => removeItem(item.id)}
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Label preview modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-4 flex flex-col gap-3"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">Label Preview</h2>
              <button className="text-slate-400 hover:text-slate-600 text-xl leading-none" onClick={() => setPreviewUrl(null)}>✕</button>
            </div>
            <img
              src={previewUrl}
              alt="Label preview"
              className="w-full rounded-lg border border-slate-200"
              style={{ imageRendering: "crisp-edges" }}
            />
            <div className="flex gap-2 justify-end">
              <button className="btn" onClick={() => setPreviewUrl(null)}>Cancel</button>
              <a
                href={printUrl(previewUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                onClick={() => setPreviewUrl(null)}
              >
                🖨️ Print PDF
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Photos */}
      <section className="card p-4">
        <h2 className="font-semibold mb-3">Photos</h2>
        <label className="btn block text-center cursor-pointer" style={{ width: "auto", display: "inline-block" }}>
          📷 Add Photo
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => uploadPhoto(e.target.files?.[0] || null)}
          />
        </label>
        {box.photos.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
            {box.photos.map((photo: any) => (
              <img
                key={photo.id}
                src={photo.url}
                alt={photo.caption || "photo"}
                className="w-full h-28 object-cover rounded-lg"
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
