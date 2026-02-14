"use client";

import Link from "next/link";
import { useState } from "react";

interface BoxLandingProps {
  box: {
    id: string;
    shortCode: string;
    roomCode: string;
    room: string;
    zone?: string | null;
    status: string;
    fragile: boolean;
    priority: string;
    items: Array<{ id: string; name: string; qty: number }>;
  };
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

export function BoxLandingClient({ box: initialBox }: BoxLandingProps) {
  const [box, setBox] = useState(initialBox);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [quickItem, setQuickItem] = useState("");
  const [addingItem, setAddingItem] = useState(false);

  async function markStatus(status: string) {
    setSaving(true);
    const res = await fetch(`/api/boxes/${box.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...box, status })
    });
    if (res.ok) {
      const updated = await res.json();
      setBox(updated);
      navigator.vibrate?.([60, 40, 160]);
      setDone(true);
    }
    setSaving(false);
  }

  async function addItem() {
    if (!quickItem.trim()) return;
    setAddingItem(true);
    const res = await fetch(`/api/boxes/${box.id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: quickItem.trim(), qty: 1, packed: true, tags: [] })
    });
    if (res.ok) {
      const items = await res.json();
      setBox({ ...box, items });
      setQuickItem("");
    }
    setAddingItem(false);
  }

  if (done && (box.status === "delivered" || box.status === "unpacked")) {
    return (
      <div className="space-y-4">
        <div
          className="card p-6 text-center"
          style={{ background: "linear-gradient(135deg, #f0fdf4, #d1fae5)", borderColor: "#6ee7b7" }}
        >
          <div style={{ fontSize: "3rem" }}>{box.status === "unpacked" ? "🏠" : "✅"}</div>
          <div className="text-xl font-bold mt-2">
            {box.status === "unpacked" ? "Unpacked!" : "Delivered!"}
          </div>
          <div className="text-slate-600 mt-1">{box.roomCode} · {box.shortCode}</div>
          <div className="text-sm text-slate-500 mt-0.5">
            {box.room}{box.zone ? ` · ${box.zone}` : ""}
          </div>
          <div className="flex gap-2 justify-center mt-4">
            <button
              className="btn text-sm"
              onClick={() => { setDone(false); }}
            >
              Back
            </button>
            <Link href={`/boxes/${box.id}`} className="btn btn-primary text-sm">
              Open detail →
            </Link>
          </div>
        </div>

        {/* Go back to scan more */}
        <Link href="/scan" className="btn block text-center">
          📷 Scan another box
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Box identity */}
      <section className="card p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold">{box.roomCode}</h1>
              {box.fragile && <span className="fragile-badge">⚠️ Fragile</span>}
              {box.priority === "high" && (
                <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                  Unpack first
                </span>
              )}
            </div>
            <div className="text-slate-500 text-sm">
              {box.shortCode} · {box.room}{box.zone ? ` · ${box.zone}` : ""}
            </div>
          </div>
          <span className={`status-badge ${STATUS_CSS[box.status] ?? "status-draft"}`}>
            {STATUS_LABEL[box.status] ?? box.status}
          </span>
        </div>
      </section>

      {/* Items */}
      {box.items.length > 0 && (
        <section className="card p-4">
          <h2 className="font-semibold mb-2">Contents ({box.items.length})</h2>
          <ul className="space-y-1">
            {box.items.map((item) => (
              <li key={item.id} className="flex items-center gap-2 text-sm">
                <span className="text-slate-400">·</span>
                <span>{item.name}</span>
                {item.qty > 1 && (
                  <span className="text-xs bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full font-semibold">×{item.qty}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Primary action */}
      <section className="card p-4 space-y-3">
        {box.status !== "delivered" && box.status !== "unpacked" && (
          <button
            className="btn btn-success w-full"
            style={{ padding: "0.9rem", fontSize: "1.05rem" }}
            onClick={() => markStatus("delivered")}
            disabled={saving}
          >
            {saving ? "Saving…" : "✅ Mark as Delivered"}
          </button>
        )}
        {box.status === "delivered" && (
          <button
            className="btn btn-primary w-full"
            style={{ padding: "0.9rem", fontSize: "1.05rem" }}
            onClick={() => markStatus("unpacked")}
            disabled={saving}
          >
            {saving ? "Saving…" : "🏠 Mark as Unpacked"}
          </button>
        )}
        {box.status === "unpacked" && (
          <div className="text-center text-emerald-700 font-semibold py-2">
            ✅ Already unpacked
          </div>
        )}

        {/* Quick add item */}
        <div className="flex gap-2 border-t border-slate-100 pt-3">
          <input
            className="field text-sm"
            placeholder="Add an item to this box…"
            value={quickItem}
            onChange={(e) => setQuickItem(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addItem(); }}
            aria-label="Quick add item"
          />
          <button
            className="btn text-sm"
            onClick={addItem}
            disabled={addingItem || !quickItem.trim()}
          >
            {addingItem ? "…" : "Add"}
          </button>
        </div>

        <Link
          href={`/boxes/${box.id}`}
          className="btn block text-center text-sm"
          style={{ color: "#0369a1" }}
        >
          Open full detail →
        </Link>
      </section>
    </div>
  );
}
