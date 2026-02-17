"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

const STATUSES = ["draft", "packed", "in_transit", "delivered", "unpacked"] as const;
const STATUS_LABEL: Record<string, string> = {
  draft: "Draft", packed: "Packed", in_transit: "In Transit", delivered: "Delivered", unpacked: "Unpacked"
};
const STATUS_COLOR: Record<string, string> = {
  draft: "#94a3b8", packed: "#3b82f6", in_transit: "#f59e0b", delivered: "#10b981", unpacked: "#8b5cf6"
};

type BoxSlim = {
  id: string;
  room: string;
  floor: string;
  house: string;
  status: string;
  fragile: boolean;
  items: { id: string }[];
};

type RoomSummary = {
  name: string;
  floor: string;
  house: string;
  boxes: BoxSlim[];
  itemCount: number;
  statusCounts: Record<string, number>;
  fragileCount: number;
};

function buildRooms(boxes: BoxSlim[]): RoomSummary[] {
  const map = new Map<string, RoomSummary>();
  for (const box of boxes) {
    if (!map.has(box.room)) {
      map.set(box.room, {
        name: box.room,
        floor: box.floor,
        house: box.house,
        boxes: [],
        itemCount: 0,
        statusCounts: {},
        fragileCount: 0
      });
    }
    const r = map.get(box.room)!;
    r.boxes.push(box);
    r.itemCount += box.items.length;
    r.statusCounts[box.status] = (r.statusCounts[box.status] ?? 0) + 1;
    if (box.fragile) r.fragileCount++;
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function RoomsClient({ boxes: initialBoxes }: { boxes: BoxSlim[] }) {
  const router = useRouter();
  const [boxes, setBoxes] = useState(initialBoxes);
  const [editingRoom, setEditingRoom] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const addRoomInputRef = useRef<HTMLInputElement>(null);

  const rooms = useMemo(() => buildRooms(boxes), [boxes]);

  function startEdit(room: RoomSummary) {
    setEditingRoom(room.name);
    setEditName(room.name);
    setError(null);
  }

  async function saveRename(oldName: string) {
    if (!editName.trim() || editName.trim() === oldName) {
      setEditingRoom(null);
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/rooms/rename", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldName, newName: editName.trim() })
    });
    if (res.ok) {
      setBoxes((prev) => prev.map((b) => b.room === oldName ? { ...b, room: editName.trim() } : b));
      setEditingRoom(null);
      router.refresh();
    } else {
      setError("Failed to rename room");
    }
    setSaving(false);
  }

  const totalBoxes = boxes.length;
  const totalItems = boxes.reduce((n, b) => n + b.items.length, 0);
  const packedOrBeyond = boxes.filter((b) => ["packed", "in_transit", "delivered", "unpacked"].includes(b.status)).length;
  const unpacked = boxes.filter((b) => b.status === "unpacked").length;

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Rooms", value: rooms.length, icon: "🏠" },
          { label: "Total Boxes", value: totalBoxes, icon: "📦" },
          { label: "Total Items", value: totalItems, icon: "📋" },
          { label: "Unpacked", value: unpacked, icon: "✅" },
        ].map(({ label, value, icon }) => (
          <div key={label} className="card p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <span>{icon}</span>
              <span className="text-xs text-slate-500 font-medium">{label}</span>
            </div>
            <div className="text-2xl font-bold">{value}</div>
          </div>
        ))}
      </section>

      {/* Add room */}
      <div className="flex items-center gap-2 justify-end">
        {showAddRoom ? (
          <div className="flex items-center gap-2 flex-wrap">
            <input
              ref={addRoomInputRef}
              className="field text-sm"
              style={{ maxWidth: 200 }}
              placeholder="Room name (e.g. Kitchen)"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newRoomName.trim()) {
                  router.push(`/boxes/new?room=${encodeURIComponent(newRoomName.trim())}`);
                }
                if (e.key === "Escape") { setShowAddRoom(false); setNewRoomName(""); }
              }}
              autoFocus
            />
            <Link
              href={newRoomName.trim() ? `/boxes/new?room=${encodeURIComponent(newRoomName.trim())}` : "#"}
              className={`btn btn-primary text-sm ${!newRoomName.trim() ? "opacity-50 pointer-events-none" : ""}`}
            >
              Add first box →
            </Link>
            <button className="btn text-sm" onClick={() => { setShowAddRoom(false); setNewRoomName(""); }}>Cancel</button>
          </div>
        ) : (
          <button className="btn btn-primary text-sm" onClick={() => setShowAddRoom(true)}>+ Add Room</button>
        )}
      </div>

      {/* Room cards */}
      {rooms.length === 0 ? (
        <div className="card p-8 text-center text-slate-400">
          <div className="text-4xl mb-2">🏠</div>
          <div>No rooms yet — click "+ Add Room" to get started</div>
        </div>
      ) : (
        rooms.map((room) => {
          const boxCount = room.boxes.length;
          const doneCount = room.statusCounts["unpacked"] ?? 0;
          const progress = boxCount > 0 ? Math.round((doneCount / boxCount) * 100) : 0;
          const isEditing = editingRoom === room.name;

          return (
            <section key={room.name} className="card p-4">
              <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex gap-2 items-center flex-wrap">
                      <input
                        className="field text-base font-semibold"
                        style={{ maxWidth: 220 }}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveRename(room.name);
                          if (e.key === "Escape") setEditingRoom(null);
                        }}
                        autoFocus
                      />
                      <button className="btn btn-primary text-sm" onClick={() => saveRename(room.name)} disabled={saving}>
                        {saving ? "Saving…" : "Save"}
                      </button>
                      <button className="btn text-sm" onClick={() => setEditingRoom(null)}>Cancel</button>
                      {error && <span className="text-xs text-red-500">{error}</span>}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-semibold">{room.name}</h2>
                      <button
                        className="text-xs text-slate-400 hover:text-sky-600"
                        title="Rename room"
                        onClick={() => startEdit(room)}
                      >
                        ✏️ Rename
                      </button>
                    </div>
                  )}
                  <div className="text-xs text-slate-400 mt-0.5">
                    {[room.house, room.floor].filter(Boolean).join(" › ")}
                    {room.fragileCount > 0 && <span className="ml-2 text-amber-500 font-medium">⚠️ {room.fragileCount} fragile</span>}
                  </div>
                </div>

                <Link
                  href={`/boxes?room=${encodeURIComponent(room.name)}`}
                  className="btn text-sm whitespace-nowrap"
                >
                  View boxes →
                </Link>
              </div>

              {/* Progress bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>{doneCount} of {boxCount} boxes unpacked</span>
                  <span className="font-semibold">{progress}%</span>
                </div>
                <div className="progress-bar">
                  <div
                    className={`progress-fill ${progress === 100 ? "progress-fill-complete" : ""}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Stats row */}
              <div className="flex gap-4 flex-wrap text-sm">
                <span className="text-slate-600"><span className="font-semibold">{boxCount}</span> boxes</span>
                <span className="text-slate-600"><span className="font-semibold">{room.itemCount}</span> items</span>
                {STATUSES.filter((s) => room.statusCounts[s]).map((s) => (
                  <span key={s} style={{ color: STATUS_COLOR[s] }} className="font-medium">
                    {room.statusCounts[s]} {STATUS_LABEL[s]}
                  </span>
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
