"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { TEMPLATE_LABELS } from "@/lib/labels/engine";

const defaultPreview = {
  roomCode: "KIT",
  shortCode: "BX-000123",
  room: "Kitchen",
  zone: "A",
  priority: "high",
  fragile: true,
  notes: "Glassware",
  qrUrl: "https://example.com/box/BX-000123"
};

export function LabelsWorkbench({ boxes }: { boxes: any[] }) {
  const [sizes, setSizes] = useState<any[]>([]);
  const [labelSizeId, setLabelSizeId] = useState("");
  const [template, setTemplate] = useState("standard_inventory");
  const [preview, setPreview] = useState<any>(null);
  const [dpi, setDpi] = useState(300);

  const selectedIds = useMemo(() => boxes.slice(0, 20).map((b) => b.id), [boxes]);

  useEffect(() => {
    fetch("/api/label-sizes").then(async (res) => {
      if (!res.ok) return;
      const data = await res.json();
      setSizes(data);
      if (data[0]) setLabelSizeId(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!labelSizeId) return;
    fetch("/api/labels/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ labelSizeId, template, data: defaultPreview })
    }).then(async (res) => {
      if (res.ok) setPreview(await res.json());
    });
  }, [labelSizeId, template]);

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
    const url = `/api/exports/${kind}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        boxIds: selectedIds,
        labelSizeId,
        template,
        dpi,
        provider: providerName
      })
    });

    if (!res.ok) {
      alert("Export failed");
      return;
    }

    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `labels.${kind === "png" && selectedIds.length > 1 ? "zip" : kind}`;
    a.click();
    URL.revokeObjectURL(href);
  }

  return (
    <div className="space-y-4">
      <section className="card p-4 grid gap-3 lg:grid-cols-3">
        <div>
          <label className="text-sm">Label size preset/custom</label>
          <select className="field mt-1" value={labelSizeId} onChange={(e) => setLabelSizeId(e.target.value)}>
            {sizes.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.widthMm}x{s.heightMm} mm)</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm">Template</label>
          <select className="field mt-1" value={template} onChange={(e) => setTemplate(e.target.value)}>
            {Object.entries(TEMPLATE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm">PNG DPI</label>
          <select className="field mt-1" value={dpi} onChange={(e) => setDpi(Number(e.target.value))}>
            <option value={300}>300 DPI</option>
            <option value={203}>203 DPI</option>
          </select>
        </div>
      </section>

      <section className="card p-4">
        <h2 className="font-semibold mb-2">Live Preview (layout constraints)</h2>
        {preview ? (
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div>Room code font: {preview.roomCodeFontPx}px</div>
              <div>Short code font: {preview.shortCodeFontPx}px</div>
              <div>QR size: {preview.qrSizeMm} mm</div>
              <div className="mt-2 border rounded p-3 bg-white max-w-sm">
                <div style={{ fontSize: `${Math.min(52, preview.roomCodeFontPx)}px`, fontWeight: 900, lineHeight: 1 }}>KIT</div>
                <div style={{ fontSize: `${Math.max(12, preview.shortCodeFontPx)}px`, fontWeight: 700 }}>BX-000123</div>
                <div className="mt-2 h-16 w-16 border-2 border-slate-900 text-[10px] flex items-center justify-center">QR</div>
              </div>
            </div>
            <div>
              <div className="text-sm">Optional lines rendered:</div>
              <ul className="list-disc ml-5 text-sm">{preview.optionalLines?.map((x: string) => <li key={x}>{x}</li>)}</ul>
              {preview.warnings?.length > 0 && <div className="text-amber-700 text-sm mt-1">{preview.warnings.join(" ")}</div>}
            </div>
          </div>
        ) : <div className="text-sm text-slate-500">Loading preview...</div>}
      </section>

      <section className="card p-4">
        <h2 className="font-semibold mb-2">Exports and provider workflow</h2>
        <div className="flex gap-2 flex-wrap">
          <button className="btn btn-primary" onClick={() => download("pdf")}>Download PDF</button>
          <button className="btn" onClick={() => download("png")}>Download PNG/ZIP</button>
          <button className="btn" onClick={() => download("csv")}>Download CSV</button>
          <button className="btn" onClick={() => download("pdf", "supvan")}>Supvan PDF</button>
          <button className="btn" onClick={() => download("png", "supvan")}>Supvan PNG</button>
          <button className="btn" onClick={() => download("pdf", "flashlabel")}>FlashLabel PDF</button>
          <button className="btn" onClick={() => download("png", "flashlabel")}>FlashLabel PNG</button>
        </div>
        <div className="text-xs text-slate-600 mt-2">Supvan/FlashLabel providers reuse PDF/PNG/CSV and support import-oriented mobile workflows.</div>
      </section>

      <section className="card p-4">
        <h2 className="font-semibold mb-2">Create custom label size</h2>
        <form className="grid gap-2 md:grid-cols-4" onSubmit={onCreateSizeSubmit}>
          <input className="field" name="name" placeholder="Preset name" required />
          <input className="field" name="widthMm" placeholder="Width (mm)" type="number" step="0.1" required />
          <input className="field" name="heightMm" placeholder="Height (mm)" type="number" step="0.1" required />
          <select className="field" name="orientation" defaultValue="landscape"><option value="portrait">portrait</option><option value="landscape">landscape</option></select>
          <input className="field" name="marginTopMm" placeholder="Top margin mm" type="number" step="0.1" defaultValue="1" />
          <input className="field" name="marginRightMm" placeholder="Right margin mm" type="number" step="0.1" defaultValue="1" />
          <input className="field" name="marginBottomMm" placeholder="Bottom margin mm" type="number" step="0.1" defaultValue="1" />
          <input className="field" name="marginLeftMm" placeholder="Left margin mm" type="number" step="0.1" defaultValue="1" />
          <input className="field" name="safePaddingMm" placeholder="Safe area mm" type="number" step="0.1" defaultValue="1" />
          <input className="field" name="cornerRadiusMm" placeholder="Corner radius mm (preview only)" type="number" step="0.1" />
          <button className="btn btn-primary md:col-span-2" type="submit">Save label size</button>
        </form>
      </section>
    </div>
  );
}
  async function onCreateSizeSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await createSize(new FormData(e.currentTarget));
    e.currentTarget.reset();
  }
