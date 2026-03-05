"use client";

import { useMemo, useState } from "react";
import { enqueueWrite, flushQueue } from "@/lib/pwa/queue";

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

type DestinationBox = {
  id: string;
  room: string;
  roomCode: string;
  shortCode: string;
  zone?: string | null;
};

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
  const [moveRoom, setMoveRoom] = useState(initialBox.room || "");
  const [moveRoomCode, setMoveRoomCode] = useState(initialBox.roomCode || "");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemName, setEditItemName] = useState("");
  const [editItemQty, setEditItemQty] = useState("1");
  const [movingItemId, setMovingItemId] = useState<string | null>(null);
  const [moveTargetBoxId, setMoveTargetBoxId] = useState("");
  const [moveTargets, setMoveTargets] = useState<DestinationBox[]>([]);
  const [loadingMoveTargets, setLoadingMoveTargets] = useState(false);
  const [movingItem, setMovingItem] = useState(false);
  const [itemActionError, setItemActionError] = useState<string | null>(null);

  const qrUrl = useMemo(() => {
    if (typeof window === "undefined") return `/box/${box.shortCode}`;
    return `${window.location.origin}/box/${box.shortCode}`;
  }, [box.shortCode]);

  const currentStatus = STATUS_OPTIONS.find((s) => s.value === box.status);
  const moveTargetOptions = useMemo(
    () =>
      moveTargets
        .filter((candidate) => candidate.id !== box.id)
        .sort((a, b) => {
          const roomCmp = (a.room || "").localeCompare(b.room || "");
          if (roomCmp !== 0) return roomCmp;
          return (a.roomCode || "").localeCompare(b.roomCode || "");
        }),
    [moveTargets, box.id]
  );

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
        if (typeof updated?.room === "string") setMoveRoom(updated.room);
        if (typeof updated?.roomCode === "string") setMoveRoomCode(updated.roomCode);
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

  async function ensureMoveTargetsLoaded() {
    if (moveTargets.length > 0) return;
    setLoadingMoveTargets(true);
    try {
      const res = await fetch("/api/boxes");
      if (!res.ok) throw new Error("Failed to load boxes.");
      const payload = await res.json();
      if (!Array.isArray(payload)) throw new Error("Invalid box payload.");
      setMoveTargets(
        payload
          .filter((entry) => typeof entry?.id === "string")
          .map((entry) => ({
            id: String(entry.id),
            room: String(entry.room || ""),
            roomCode: String(entry.roomCode || ""),
            shortCode: String(entry.shortCode || ""),
            zone: typeof entry.zone === "string" ? entry.zone : null
          }))
      );
    } catch {
      setItemActionError("Could not load destination boxes.");
    } finally {
      setLoadingMoveTargets(false);
    }
  }

  async function openMoveItem(itemId: string) {
    setItemActionError(null);
    setMovingItemId(itemId);
    setMoveTargetBoxId("");
    await ensureMoveTargetsLoaded();
  }

  function cancelMoveItem() {
    setMovingItemId(null);
    setMoveTargetBoxId("");
  }

  async function confirmMoveItem(item: any) {
    if (!movingItemId || !moveTargetBoxId) return;
    setMovingItem(true);
    setItemActionError(null);
    try {
      const res = await fetch("/api/items/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, sourceBoxId: box.id, targetBoxId: moveTargetBoxId })
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setItemActionError(typeof body.error === "string" ? body.error : "Could not move item.");
        return;
      }
      if (Array.isArray(body.sourceItems)) {
        setBox({ ...box, items: body.sourceItems });
      }
      cancelMoveItem();
    } catch {
      setItemActionError("Network error while moving item.");
    } finally {
      setMovingItem(false);
    }
  }

  function startEditItem(item: any) {
    setEditingItemId(item.id);
    setEditItemName(String(item.name ?? ""));
    setEditItemQty(String(Math.max(1, Number(item.qty) || 1)));
  }

  function cancelEditItem() {
    setEditingItemId(null);
    setEditItemName("");
    setEditItemQty("1");
  }

  async function saveEditItem(item: any) {
    if (!editingItemId) return;
    const trimmedName = editItemName.trim();
    if (!trimmedName) return;
    const safeQty = Math.max(1, Number(editItemQty) || 1);
    const payload = {
      id: item.id,
      name: trimmedName,
      qty: safeQty,
      packed: Boolean(item.packed),
      tags: Array.isArray(item.tags) ? item.tags : []
    };

    const res = await fetch(`/api/boxes/${box.id}/items`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) return;

    const updated = await res.json();
    setBox({
      ...box,
      items: box.items.map((current: any) => (current.id === updated.id ? { ...current, ...updated } : current))
    });
    cancelEditItem();
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
            <a
              href={`/api/exports/label/${box.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary text-sm"
              style={{ padding: "0.4rem 0.85rem" }}
            >
              🏷️ Print Label
            </a>
            <a
              href={`/api/exports/label/${box.id}?template=inventory_4x6&labelSizeId=4x6-inch-(inventory)`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn text-sm"
              style={{ padding: "0.4rem 0.85rem" }}
            >
              📋 4×6 Inventory
            </a>
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

      {/* Room move */}
      <section className="card p-4">
        <h2 className="font-semibold mb-3">Room</h2>
        <div className="grid gap-2 sm:grid-cols-[1fr,120px,auto] items-end">
          <div>
            <label className="form-label">Room Name</label>
            <input
              className="field"
              value={moveRoom}
              onChange={(e) => setMoveRoom(e.target.value)}
              placeholder="e.g. Living Room"
            />
          </div>
          <div>
            <label className="form-label">Room Code</label>
            <input
              className="field"
              value={moveRoomCode}
              onChange={(e) => setMoveRoomCode(e.target.value.toUpperCase())}
              placeholder="e.g. LR"
              maxLength={5}
            />
          </div>
          <button
            className="btn"
            disabled={saving || !moveRoom.trim()}
            onClick={() => patchBox({ room: moveRoom.trim(), roomCode: moveRoomCode.trim() || box.roomCode })}
          >
            Move Box
          </button>
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
          {itemActionError && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">{itemActionError}</div>}
          {box.items.length === 0 ? (
            <div className="text-sm text-slate-400 text-center py-4">No items yet — add some above</div>
          ) : (
            box.items.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                {editingItemId === item.id ? (
                  <div className="w-full flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      className="field text-sm"
                      value={editItemName}
                      onChange={(e) => setEditItemName(e.target.value)}
                      placeholder="Item name"
                    />
                    <input
                      className="field text-sm sm:w-24"
                      type="number"
                      min={1}
                      step={1}
                      value={editItemQty}
                      onChange={(e) => setEditItemQty(e.target.value)}
                      placeholder="Qty"
                    />
                    <div className="flex gap-1.5">
                      <button className="btn btn-primary text-xs" style={{ padding: "0.2rem 0.5rem" }} onClick={() => saveEditItem(item)}>
                        Save
                      </button>
                      <button className="btn text-xs" style={{ padding: "0.2rem 0.5rem" }} onClick={cancelEditItem}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{item.name}</span>
                      {item.qty > 1 && (
                        <span className="text-xs font-semibold bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full">×{item.qty}</span>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      {movingItemId === item.id ? (
                        <div className="flex flex-wrap justify-end items-center gap-1.5">
                          <select
                            className="field text-xs"
                            style={{ minWidth: "220px", padding: "0.3rem 0.45rem" }}
                            value={moveTargetBoxId}
                            disabled={loadingMoveTargets || movingItem}
                            onChange={(e) => setMoveTargetBoxId(e.target.value)}
                          >
                            <option value="">{loadingMoveTargets ? "Loading boxes..." : "Select destination box"}</option>
                            {moveTargetOptions.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.roomCode} · {option.room}{option.zone ? ` / ${option.zone}` : ""} · {option.shortCode}
                              </option>
                            ))}
                          </select>
                          <button
                            className="btn btn-primary text-xs"
                            style={{ padding: "0.2rem 0.5rem" }}
                            disabled={!moveTargetBoxId || movingItem}
                            onClick={() => confirmMoveItem(item)}
                          >
                            {movingItem ? "Moving..." : "Confirm"}
                          </button>
                          <button className="btn text-xs" style={{ padding: "0.2rem 0.5rem" }} onClick={cancelMoveItem}>
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          className="btn text-xs"
                          style={{ padding: "0.2rem 0.5rem" }}
                          onClick={() => openMoveItem(item.id)}
                        >
                          Move
                        </button>
                      )}
                      <button
                        className="btn text-xs"
                        style={{ padding: "0.2rem 0.5rem" }}
                        onClick={() => startEditItem(item)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-danger text-xs"
                        style={{ padding: "0.2rem 0.5rem" }}
                        onClick={() => removeItem(item.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </section>

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
