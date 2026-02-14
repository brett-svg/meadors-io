"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { TEMPLATE_LABELS } from "@/lib/labels/engine";
import QRCode from "qrcode";

const PREVIEW_BOX = {
  roomCode: "KIT",
  shortCode: "BX-000123",
  room: "Kitchen",
  zone: "A",
  priority: "high",
  fragile: true,
  notes: "Glassware",
  qrUrl: ""  // filled in dynamically
};

export function LabelsWorkbench({ boxes }: { boxes: any[] }) {
  const [sizes, setSizes] = useState<any[]>([]);
  const [labelSizeId, setLabelSizeId] = useState("");
  const [template, setTemplate] = useState("standard_inventory");
  const [preview, setPreview] = useState<any>(null);
  const [dpi, setDpi] = useState(300);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewQrDataUrl, setPreviewQrDataUrl] = useState<string>("");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Initialise selection to all boxes
  useEffect(() => {
    setSelectedIds(new Set(boxes.map((b) => b.id)));
  }, [boxes]);

  // Generate real QR data URL for preview
  useEffect(() => {
    QRCode.toDataURL("https://example.com/box/BX-000123", { margin: 0, errorCorrectionLevel: "M" })
      .then(setPreviewQrDataUrl)
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/label-sizes").then(async (res) => {
      if (!res.ok) return;
      const data = await res.json();
      setSizes(data);
      const preferred = data.find((s: any) => s.id === "4x6-inch-(inventory)") ?? data[0];
      if (preferred) {
        setLabelSizeId(preferred.id);
        if (preferred.id === "4x6-inch-(inventory)") setTemplate("inventory_4x6");
      }
    });
  }, []);

  useEffect(() => {
    if (!labelSizeId) return;
    fetch("/api/labels/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ labelSizeId, template, data: { ...PREVIEW_BOX, qrUrl: "https://example.com/box/BX-000123" } })
    }).then(async (res) => {
      if (res.ok) setPreview(await res.json());
    });
  }, [labelSizeId, template]);

  const activeIds = useMemo(() => [...selectedIds], [selectedIds]);

  function toggleBox(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() { setSelectedIds(new Set(boxes.map((b) => b.id))); }
  function selectNone() { setSelectedIds(new Set()); }

  async function createSize(formData: FormData) {
    const payload = Object.fromEntries(formData.entries());
    const res = await fetch("/api/label-sizes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const row = await res.json();
      setSizes((prev) => [row, ...prev]);
      setLabelSizeId(row.id);
    }
  }

  async function download(kind: "pdf" | "png" | "csv", providerName?: string) {
    if (activeIds.length === 0) {
      setExportError("Select at least one box to export.");
      return;
    }
    setExporting(true);
    setExportError(null);
    const url = `/api/exports/${kind}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boxIds: activeIds, labelSizeId, template, dpi, provider: providerName })
    });

    if (!res.ok) {
      setExportError("Export failed. Check that label sizes are configured.");
      setExporting(false);
      return;
    }

    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `labels.${kind === "png" && activeIds.length > 1 ? "zip" : kind}`;
    a.click();
    URL.revokeObjectURL(href);
    setExporting(false);
  }

  async function onCreateSizeSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await createSize(new FormData(e.currentTarget));
    e.currentTarget.reset();
  }

  const qrPreviewSize = preview ? Math.min(80, Math.round((preview.qrSizeMm / 25.4) * 96)) : 64;

  return (
    <div className="space-y-4">

      {/* Settings row */}
      <section className="card p-4 grid gap-3 lg:grid-cols-3">
        <div>
          <label className="form-label">Label size</label>
          <select className="field" value={labelSizeId} onChange={(e) => setLabelSizeId(e.target.value)}>
            {sizes.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.widthMm}×{s.heightMm} mm)</option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label">Template</label>
          <select className="field" value={template} onChange={(e) => setTemplate(e.target.value)}>
            {Object.entries(TEMPLATE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label">PNG resolution</label>
          <select className="field" value={dpi} onChange={(e) => setDpi(Number(e.target.value))}>
            <option value={300}>300 DPI (high quality)</option>
            <option value={203}>203 DPI (thermal printer)</option>
          </select>
        </div>
      </section>

      {/* Live preview with REAL QR code */}
      <section className="card p-4">
        <h2 className="font-semibold mb-3">Label Preview</h2>
        {preview ? (
          <div className="flex flex-wrap gap-6 items-start">
            {/* Visual label mock */}
            <div
              className="border-2 border-slate-800 rounded"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 12px",
                background: "white",
                minWidth: 200,
                maxWidth: 320,
                gap: 8
              }}
            >
              <div>
                <div style={{ fontSize: Math.min(40, preview.roomCodeFontPx), fontWeight: 900, lineHeight: 1.1 }}>KIT</div>
                <div style={{ fontSize: Math.max(10, preview.shortCodeFontPx * 0.8), fontWeight: 700, color: "#374151" }}>BX-000123</div>
                {preview.optionalLines?.slice(0, 3).map((line: string, i: number) => (
                  <div key={i} style={{ fontSize: 9, color: "#6b7280", marginTop: 2 }}>{line}</div>
                ))}
              </div>
              {previewQrDataUrl ? (
                <img
                  src={previewQrDataUrl}
                  alt="QR code preview"
                  style={{ width: qrPreviewSize, height: qrPreviewSize, flexShrink: 0 }}
                />
              ) : (
                <div style={{ width: qrPreviewSize, height: qrPreviewSize, background: "#f1f5f9", borderRadius: 4 }} />
              )}
            </div>
            {/* Layout info */}
            <div className="text-sm space-y-1 text-slate-600">
              <div>Room code: <strong>{preview.roomCodeFontPx}px</strong></div>
              <div>Short code: <strong>{preview.shortCodeFontPx}px</strong></div>
              <div>QR size: <strong>{preview.qrSizeMm} mm</strong></div>
              {preview.warnings?.length > 0 && (
                <div className="text-amber-700 text-xs mt-2">⚠ {preview.warnings.join(" ")}</div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-400">Loading preview…</div>
        )}
      </section>

      {/* Box selection */}
      <section className="card p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="font-semibold">
            Select Boxes
            <span className="text-slate-400 font-normal text-sm ml-2">
              {activeIds.length} of {boxes.length} selected
            </span>
          </h2>
          <div className="flex gap-2 text-sm">
            <button className="btn" onClick={selectAll}>All</button>
            <button className="btn" onClick={selectNone}>None</button>
          </div>
        </div>
        {boxes.length === 0 ? (
          <div className="text-sm text-slate-400">No boxes yet. <a href="/boxes/new" className="text-sky-600 underline">Create a box</a> to get started.</div>
        ) : (
          <div className="grid gap-1.5 sm:grid-cols-2 md:grid-cols-3">
            {boxes.map((box) => {
              const checked = selectedIds.has(box.id);
              return (
                <label
                  key={box.id}
                  className="flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors"
                  style={{
                    borderColor: checked ? "#0369a1" : "#e2e8f0",
                    background: checked ? "#eff6ff" : "white"
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleBox(box.id)}
                    className="rounded"
                    aria-label={`Select ${box.roomCode} (${box.shortCode})`}
                  />
                  <div className="min-w-0">
                    <div className="font-semibold text-sm">{box.roomCode}</div>
                    <div className="text-xs text-slate-400 truncate">{box.shortCode} · {box.room}</div>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </section>

      {/* Export */}
      <section className="card p-4">
        <h2 className="font-semibold mb-3">
          Export {activeIds.length > 0 ? `${activeIds.length} label${activeIds.length !== 1 ? "s" : ""}` : ""}
        </h2>
        {exportError && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3" role="alert">
            {exportError}
          </div>
        )}
        <div className="flex gap-2 flex-wrap">
          <button className="btn btn-primary" onClick={() => download("pdf")} disabled={exporting || activeIds.length === 0}>
            {exporting ? "Exporting…" : "📄 PDF"}
          </button>
          <button className="btn" onClick={() => download("png")} disabled={exporting || activeIds.length === 0}>
            🖼️ PNG{activeIds.length > 1 ? " (ZIP)" : ""}
          </button>
          <button className="btn" onClick={() => download("csv")} disabled={exporting || activeIds.length === 0}>
            📊 CSV
          </button>
        </div>
        <div className="mt-3 border-t border-slate-100 pt-3">
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-2">Label printer apps</div>
          <div className="flex gap-2 flex-wrap">
            <button className="btn text-sm" onClick={() => download("pdf", "supvan")} disabled={exporting || activeIds.length === 0}>Supvan PDF</button>
            <button className="btn text-sm" onClick={() => download("png", "supvan")} disabled={exporting || activeIds.length === 0}>Supvan PNG</button>
            <button className="btn text-sm" onClick={() => download("pdf", "flashlabel")} disabled={exporting || activeIds.length === 0}>FlashLabel PDF</button>
            <button className="btn text-sm" onClick={() => download("png", "flashlabel")} disabled={exporting || activeIds.length === 0}>FlashLabel PNG</button>
          </div>
        </div>
      </section>

      {/* Custom label size */}
      <section className="card p-4">
        <h2 className="font-semibold mb-3">Create Custom Label Size</h2>
        <form className="grid gap-2 sm:grid-cols-2 md:grid-cols-4" onSubmit={onCreateSizeSubmit}>
          <div className="sm:col-span-2 md:col-span-4">
            <label className="form-label">Name</label>
            <input className="field" name="name" placeholder="e.g. My thermal 60x40" required />
          </div>
          <div>
            <label className="form-label">Width (mm)</label>
            <input className="field" name="widthMm" placeholder="e.g. 60" type="number" step="0.1" required />
          </div>
          <div>
            <label className="form-label">Height (mm)</label>
            <input className="field" name="heightMm" placeholder="e.g. 40" type="number" step="0.1" required />
          </div>
          <div>
            <label className="form-label">Orientation</label>
            <select className="field" name="orientation" defaultValue="landscape">
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </div>
          <div>
            <label className="form-label">Margin (mm)</label>
            <input className="field" name="marginTopMm" placeholder="Top" type="number" step="0.1" defaultValue="1" />
          </div>
          <button className="btn btn-primary sm:col-span-2" type="submit">Save label size</button>
        </form>
      </section>
    </div>
  );
}
