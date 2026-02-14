"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft", icon: "✏️", cls: "status-draft" },
  { value: "packed", label: "Packed", icon: "📦", cls: "status-packed" },
  { value: "in_transit", label: "In Transit", icon: "🚛", cls: "status-transit" },
  { value: "delivered", label: "Delivered", icon: "✅", cls: "status-delivered" },
  { value: "unpacked", label: "Unpacked", icon: "🏠", cls: "status-unpacked" },
];

function statusIcon(s: string) {
  return STATUS_OPTIONS.find((o) => o.value === s)?.icon ?? "📦";
}
function statusLabel(s: string) {
  return STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s;
}
function statusClass(s: string) {
  return STATUS_OPTIONS.find((o) => o.value === s)?.cls ?? "status-draft";
}

export function BoxList({ boxes }: { boxes: any[] }) {
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const rooms = useMemo(() => {
    const set = new Set(boxes.map((b) => b.room).filter(Boolean));
    return Array.from(set).sort();
  }, [boxes]);

  const filtered = useMemo(() => {
    let result = boxes;
    if (statusFilter) result = result.filter((b) => b.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (b) =>
          b.roomCode?.toLowerCase().includes(q) ||
          b.shortCode?.toLowerCase().includes(q) ||
          b.room?.toLowerCase().includes(q) ||
          b.zone?.toLowerCase().includes(q) ||
          b.items?.some((item: any) => item.name?.toLowerCase().includes(q))
      );
    }
    return result;
  }, [boxes, statusFilter, search]);

  // Group by room
  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const box of filtered) {
      const key = box.room || "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(box);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <section className="card p-3 flex flex-col sm:flex-row gap-3">
        <input
          className="field"
          placeholder="Search room, code, item…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex gap-1 flex-wrap">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`btn text-sm ${statusFilter === opt.value ? "btn-primary" : ""}`}
              style={{ padding: "0.3rem 0.7rem" }}
              onClick={() => setStatusFilter(opt.value)}
            >
              {opt.icon ? `${opt.icon} ` : ""}{opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* Count */}
      <div className="text-sm text-slate-500">
        {filtered.length} box{filtered.length !== 1 ? "es" : ""}
        {statusFilter || search ? " (filtered)" : ""}
      </div>

      {/* Grouped list */}
      {grouped.length === 0 ? (
        <div className="card p-8 text-center text-slate-400">
          <div className="text-4xl mb-2">📦</div>
          <div>No boxes found</div>
        </div>
      ) : (
        grouped.map(([room, roomBoxes]) => (
          <section key={room} className="card p-4">
            <h2 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
              {room}
              <span className="text-xs font-normal text-slate-400">{roomBoxes.length} box{roomBoxes.length !== 1 ? "es" : ""}</span>
            </h2>
            <div className="grid gap-2 md:grid-cols-2">
              {roomBoxes.map((box) => (
                <Link
                  key={box.id}
                  href={`/boxes/${box.id}`}
                  className="card card-hover p-3 block"
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{box.roomCode}</span>
                      {box.fragile && <span className="fragile-badge">⚠️ Fragile</span>}
                    </div>
                    <span className={`status-badge ${statusClass(box.status)}`}>
                      {statusIcon(box.status)} {statusLabel(box.status)}
                    </span>
                  </div>
                  <div className="text-sm text-slate-500">{box.zone ? `Zone ${box.zone}` : ""}</div>
                  <div className="flex items-center justify-between mt-1">
                    <div className="text-xs text-slate-400">{box.items.length} item{box.items.length !== 1 ? "s" : ""}</div>
                    <div className="text-xs text-slate-400">{box.shortCode}</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
