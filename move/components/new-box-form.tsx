"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { trackBoxCreate } from "@/lib/analytics/track";

const ROOM_MAP: Record<string, string> = {
  kitchen: "KIT",
  "primary bedroom": "PB",
  bedroom: "BR",
  "guest bedroom": "GB",
  bathroom: "BA",
  "living room": "LR",
  "dining room": "DR",
  office: "OFC",
  garage: "GAR",
  laundry: "LND",
  basement: "BSMT",
  attic: "ATC",
  closet: "CL",
  pantry: "PAN",
  hallway: "HALL",
  entryway: "ENT",
  playroom: "PLAY",
  storage: "STOR",
  patio: "PAT",
  balcony: "BAL",
  shed: "SHED"
};

const COMMON_ROOMS = ["Kitchen", "Living Room", "Bedroom", "Bathroom", "Office", "Garage", "Dining Room", "Guest Bedroom"];

function suggest(room: string) {
  const key = room.trim().toLowerCase();
  if (ROOM_MAP[key]) return ROOM_MAP[key];
  const words = room.trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) return words.map((w) => w[0].toUpperCase()).join("").slice(0, 5);
  return (words[0] || "ROOM").slice(0, 5).toUpperCase();
}

export function NewBoxForm() {
  const router = useRouter();
  const [room, setRoom] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [fragile, setFragile] = useState(false);
  const [saving, setSaving] = useState(false);

  const suggestion = useMemo(() => suggest(room), [room]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const raw = Object.fromEntries(formData.entries()) as Record<string, unknown>;
    const payload = {
      ...raw,
      roomCode: String(roomCode || suggestion),
      fragile
    };

    const res = await fetch("/api/boxes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      alert("Could not create box");
      setSaving(false);
      return;
    }

    const box = await res.json();
    trackBoxCreate(box.id);
    router.push(`/boxes/${box.id}`);
    router.refresh();
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      {/* Location */}
      <div>
        <h2 className="font-semibold text-slate-700 mb-3">Location</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="form-label">House / Building</label>
            <input className="field" name="house" placeholder="e.g. Main House" defaultValue="Main House" required />
          </div>
          <div>
            <label className="form-label">Floor</label>
            <input className="field" name="floor" placeholder="e.g. Main, Upstairs" defaultValue="Main" required />
          </div>
          <div>
            <label className="form-label">Room</label>
            <input
              className="field"
              name="room"
              placeholder="e.g. Kitchen, Bedroom"
              required
              value={room}
              onChange={(e) => setRoom(e.target.value)}
            />
            {/* Quick-pick common rooms */}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {COMMON_ROOMS.map((r) => (
                <button
                  key={r}
                  type="button"
                  className="text-xs px-2 py-0.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
                  onClick={() => setRoom(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="form-label">Zone <span className="text-slate-400 font-normal">(optional)</span></label>
            <input className="field" name="zone" placeholder="e.g. North Wall, Closet" />
          </div>
        </div>
      </div>

      {/* Room code */}
      <div>
        <label className="form-label">Room Code</label>
        <input
          className="field"
          name="roomCode"
          placeholder={suggestion || "RM"}
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
        />
        {room && (
          <div className="text-xs text-slate-500 mt-1">
            Auto-suggested: <strong>{suggestion}</strong>
            {!roomCode && (
              <button
                type="button"
                className="ml-2 text-sky-600 underline"
                onClick={() => setRoomCode(suggestion)}
              >
                Use this
              </button>
            )}
          </div>
        )}
      </div>

      {/* Details */}
      <div>
        <h2 className="font-semibold text-slate-700 mb-3">Details</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="form-label">Category <span className="text-slate-400 font-normal">(optional)</span></label>
            <input className="field" name="category" placeholder="e.g. Books, Clothes, Kitchen" />
          </div>
          <div>
            <label className="form-label">Priority</label>
            <select className="field" name="priority" defaultValue="medium">
              <option value="low">🟢 Low — Unpack whenever</option>
              <option value="medium">🟡 Medium — Unpack soon</option>
              <option value="high">🔴 High — Unpack first</option>
            </select>
          </div>
          <div>
            <label className="form-label">Initial Status</label>
            <select className="field" name="status" defaultValue="draft">
              <option value="draft">✏️ Draft</option>
              <option value="packed">📦 Packed</option>
              <option value="in_transit">🚛 In Transit</option>
              <option value="delivered">✅ Delivered</option>
              <option value="unpacked">🏠 Unpacked</option>
            </select>
          </div>
          <div className="flex items-center">
            <label
              className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border w-full transition-colors"
              style={{
                background: fragile ? "#fef3c7" : "white",
                borderColor: fragile ? "#fde68a" : "var(--border)"
              }}
            >
              <div
                className="w-10 h-6 rounded-full relative transition-colors flex-shrink-0"
                style={{ background: fragile ? "#f59e0b" : "#e2e8f0" }}
              >
                <div
                  className="w-4 h-4 rounded-full bg-white shadow absolute top-1 transition-transform"
                  style={{ transform: fragile ? "translateX(20px)" : "translateX(4px)" }}
                />
              </div>
              <input
                type="checkbox"
                className="sr-only"
                checked={fragile}
                onChange={(e) => setFragile(e.target.checked)}
              />
              <div>
                <div className="font-medium text-sm">Fragile contents</div>
                <div className="text-xs text-slate-500">Handle with care</div>
              </div>
            </label>
          </div>
        </div>
      </div>

      <div>
        <label className="form-label">Notes <span className="text-slate-400 font-normal">(optional)</span></label>
        <textarea className="field" name="notes" placeholder="Any extra notes about this box..." rows={3} />
      </div>

      <div>
        <button className="btn btn-primary w-full sm:w-auto" style={{ padding: "0.65rem 1.5rem" }} disabled={saving} type="submit">
          {saving ? "Creating box..." : "📦 Create Box"}
        </button>
      </div>
    </form>
  );
}
