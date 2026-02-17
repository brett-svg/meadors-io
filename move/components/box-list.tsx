"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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

export function BoxList({ boxes: initialBoxes, initialRoom }: { boxes: any[]; initialRoom?: string }) {
  const router = useRouter();
  const [boxes, setBoxes] = useState(initialBoxes);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState(initialRoom ?? "");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

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

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const box of filtered) {
      const key = box.room || "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(box);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(filtered.map((b) => b.id)));
  }

  function cancelSelect() {
    setSelectMode(false);
    setSelected(new Set());
  }

  async function deleteSelected() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} box${selected.size !== 1 ? "es" : ""}? This cannot be undone.`)) return;
    setDeleting(true);
    await Promise.all([...selected].map((id) => fetch(`/api/boxes/${id}`, { method: "DELETE" })));
    setBoxes((prev) => prev.filter((b) => !selected.has(b.id)));
    setSelected(new Set());
    setSelectMode(false);
    setDeleting(false);
    router.refresh();
  }

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

      {/* Count + select mode toggle */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">
          {filtered.length} box{filtered.length !== 1 ? "es" : ""}
          {statusFilter || search ? " (filtered)" : ""}
        </div>
        {!selectMode ? (
          <button className="btn text-xs text-slate-400" style={{ padding: "0.25rem 0.6rem" }} onClick={() => setSelectMode(true)}>
            Select to delete
          </button>
        ) : (
          <div className="flex gap-2 items-center">
            <button className="btn text-xs" style={{ padding: "0.25rem 0.6rem" }} onClick={selectAll}>Select all ({filtered.length})</button>
            <button
              className="btn btn-danger text-xs"
              style={{ padding: "0.25rem 0.6rem" }}
              onClick={deleteSelected}
              disabled={deleting || selected.size === 0}
            >
              {deleting ? "Deleting…" : `🗑️ Delete (${selected.size})`}
            </button>
            <button className="btn text-xs text-slate-400" style={{ padding: "0.25rem 0.6rem" }} onClick={cancelSelect}>Cancel</button>
          </div>
        )}
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
                selectMode ? (
                  <div
                    key={box.id}
                    className={`card p-3 cursor-pointer flex items-start gap-3 ${selected.has(box.id) ? "border-red-400 bg-red-50" : ""}`}
                    onClick={() => toggleSelect(box.id)}
                  >
                    <input type="checkbox" readOnly checked={selected.has(box.id)} className="mt-1 accent-red-500" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{box.roomCode}</span>
                          {box.fragile && <span className="fragile-badge">⚠️ Fragile</span>}
                        </div>
                        <span className={`status-badge ${statusClass(box.status)}`}>
                          {statusIcon(box.status)} {statusLabel(box.status)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">{box.items.length} items · {box.shortCode}</div>
                    </div>
                  </div>
                ) : (
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
                )
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
