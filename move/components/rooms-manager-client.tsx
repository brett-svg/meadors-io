"use client";

import { useMemo, useState } from "react";

type RoomBox = {
  id: string;
  room: string;
  roomCode: string;
  shortCode: string;
  zone: string | null;
  status: string;
  fragile: boolean;
  updatedAt: string | Date;
  _count: { items: number };
};

function statusLabel(status: string) {
  const map: Record<string, string> = {
    draft: "Draft",
    packed: "Packed",
    in_transit: "In Transit",
    delivered: "Delivered",
    unpacked: "Unpacked"
  };
  return map[status] ?? status;
}

function statusClass(status: string) {
  const map: Record<string, string> = {
    draft: "status-draft",
    packed: "status-packed",
    in_transit: "status-transit",
    delivered: "status-delivered",
    unpacked: "status-unpacked"
  };
  return map[status] ?? "status-draft";
}

export function RoomsManagerClient({ initialBoxes }: { initialBoxes: RoomBox[] }) {
  const [boxes, setBoxes] = useState(initialBoxes);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [moveRoom, setMoveRoom] = useState("");
  const [moveCode, setMoveCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [renameMap, setRenameMap] = useState<Record<string, { toRoom: string; roomCode: string }>>({});

  const grouped = useMemo(() => {
    const map = new Map<string, RoomBox[]>();
    for (const box of boxes) {
      const key = box.room || "Unassigned";
      const row = map.get(key) ?? [];
      row.push(box);
      map.set(key, row);
    }
    return Array.from(map.entries())
      .map(([room, list]) => ({
        room,
        boxCount: list.length,
        itemCount: list.reduce((acc, box) => acc + box._count.items, 0),
        roomCodes: Array.from(new Set(list.map((box) => box.roomCode).filter(Boolean))),
        boxes: list
      }))
      .sort((a, b) => a.room.localeCompare(b.room));
  }, [boxes]);

  const roomNames = grouped.map((room) => room.room);

  function applyResult(data: any, successMessage: string) {
    if (!data || !Array.isArray(data.boxes)) return;
    setBoxes(data.boxes);
    setSelectedIds([]);
    setNotice(successMessage.replace("{count}", String(data.updatedCount ?? 0)));
    setError(null);
  }

  async function runAction(payload: Record<string, unknown>, successMessage: string) {
    setSaving(true);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch("/api/rooms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof body.error === "string" ? body.error : "Request failed.");
        return;
      }
      applyResult(body, successMessage);
    } catch {
      setError("Network error while saving room changes.");
    } finally {
      setSaving(false);
    }
  }

  async function moveSelected() {
    const toRoom = moveRoom.trim();
    if (!toRoom || selectedIds.length === 0) return;
    await runAction(
      { action: "move_boxes", boxIds: selectedIds, toRoom, roomCode: moveCode.trim() || undefined },
      "Moved {count} boxes."
    );
    setMoveRoom("");
    setMoveCode("");
  }

  async function renameRoom(fromRoom: string) {
    const value = renameMap[fromRoom] ?? { toRoom: fromRoom, roomCode: "" };
    const toRoom = value.toRoom.trim();
    if (!toRoom) return;
    await runAction(
      { action: "rename", fromRoom, toRoom, roomCode: value.roomCode.trim() || undefined },
      "Updated {count} boxes in the room rename."
    );
  }

  function toggleSelect(boxId: string, checked: boolean) {
    setSelectedIds((current) => {
      if (checked) return current.includes(boxId) ? current : [...current, boxId];
      return current.filter((id) => id !== boxId);
    });
  }

  function toggleRoomSelection(room: string, checked: boolean) {
    const ids = boxes.filter((box) => box.room === room).map((box) => box.id);
    setSelectedIds((current) => {
      if (checked) return Array.from(new Set([...current, ...ids]));
      const removeSet = new Set(ids);
      return current.filter((id) => !removeSet.has(id));
    });
  }

  return (
    <main className="space-y-4">
      <section className="card p-4 space-y-3" style={{ background: "linear-gradient(135deg, #ecfeff 0%, #f8fafc 100%)", borderColor: "#a5f3fc" }}>
        <div>
          <h1 className="text-xl font-semibold">Room Management</h1>
          <p className="text-sm text-slate-600 mt-1">Rename rooms and move boxes between rooms in bulk.</p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <div className="card p-3">
            <div className="text-xs text-slate-500">Rooms</div>
            <div className="text-2xl font-bold">{grouped.length}</div>
          </div>
          <div className="card p-3">
            <div className="text-xs text-slate-500">Boxes</div>
            <div className="text-2xl font-bold">{boxes.length}</div>
          </div>
          <div className="card p-3">
            <div className="text-xs text-slate-500">Selected for move</div>
            <div className="text-2xl font-bold">{selectedIds.length}</div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-[1fr,140px,auto] items-end">
          <div>
            <label className="form-label">Move selected boxes to room</label>
            <input
              className="field"
              placeholder="e.g. Guest Bedroom"
              value={moveRoom}
              onChange={(e) => setMoveRoom(e.target.value)}
            />
          </div>
          <div>
            <label className="form-label">Room Code</label>
            <input
              className="field"
              maxLength={5}
              placeholder="Auto"
              value={moveCode}
              onChange={(e) => setMoveCode(e.target.value.toUpperCase())}
            />
          </div>
          <button className="btn btn-primary" onClick={moveSelected} disabled={saving || selectedIds.length === 0 || !moveRoom.trim()}>
            {saving ? "Saving..." : "Move Selected"}
          </button>
        </div>

        {roomNames.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {roomNames.map((room) => (
              <button key={`pick-${room}`} className="btn text-xs" style={{ padding: "0.2rem 0.45rem" }} onClick={() => setMoveRoom(room)}>
                {room}
              </button>
            ))}
          </div>
        )}

        {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
        {notice && <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{notice}</div>}
      </section>

      {grouped.length === 0 ? (
        <section className="card p-6 text-center text-slate-500">No rooms yet. Create a box first to establish rooms.</section>
      ) : (
        grouped.map((roomGroup) => {
          const allSelected = roomGroup.boxes.every((box) => selectedIds.includes(box.id));
          const renameState = renameMap[roomGroup.room] ?? {
            toRoom: roomGroup.room,
            roomCode: roomGroup.roomCodes[0] ?? ""
          };

          return (
            <section key={roomGroup.room} className="card p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-semibold text-lg">{roomGroup.room}</div>
                  <div className="text-xs text-slate-500">
                    {roomGroup.boxCount} box{roomGroup.boxCount !== 1 ? "es" : ""} · {roomGroup.itemCount} item{roomGroup.itemCount !== 1 ? "s" : ""}
                    {roomGroup.roomCodes.length > 0 && ` · Codes: ${roomGroup.roomCodes.join(", ")}`}
                  </div>
                </div>
                <label className="text-xs text-slate-600 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => toggleRoomSelection(roomGroup.room, e.target.checked)}
                  />
                  Select all in room
                </label>
              </div>

              <div className="grid gap-2 sm:grid-cols-[1fr,140px,auto] items-end">
                <div>
                  <label className="form-label">Rename room</label>
                  <input
                    className="field"
                    value={renameState.toRoom}
                    onChange={(e) => setRenameMap((current) => ({
                      ...current,
                      [roomGroup.room]: { ...renameState, toRoom: e.target.value }
                    }))}
                  />
                </div>
                <div>
                  <label className="form-label">Room Code</label>
                  <input
                    className="field"
                    maxLength={5}
                    value={renameState.roomCode}
                    onChange={(e) => setRenameMap((current) => ({
                      ...current,
                      [roomGroup.room]: { ...renameState, roomCode: e.target.value.toUpperCase() }
                    }))}
                  />
                </div>
                <button className="btn" onClick={() => renameRoom(roomGroup.room)} disabled={saving || !renameState.toRoom.trim()}>
                  {saving ? "Saving..." : "Rename"}
                </button>
              </div>

              <div className="space-y-1.5">
                {roomGroup.boxes.map((box) => (
                  <div key={box.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2 flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(box.id)}
                        onChange={(e) => toggleSelect(box.id, e.target.checked)}
                      />
                      <span className="text-sm font-medium truncate">{box.roomCode} · {box.shortCode}</span>
                      {box.fragile && <span className="fragile-badge">⚠️ Fragile</span>}
                    </label>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      {box.zone ? <span>{box.zone}</span> : null}
                      <span>{box._count.items} item{box._count.items !== 1 ? "s" : ""}</span>
                      <span className={`status-badge ${statusClass(box.status)}`}>{statusLabel(box.status)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })
      )}
    </main>
  );
}
