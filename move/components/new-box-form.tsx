"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { trackBoxCreate, trackQuickCreateTap } from "@/lib/analytics/track";
import { suggestRoomCode } from "@/lib/auth/room-code";
import { buildQuickBoxPayload } from "@/lib/utils/quick-box";

const COMMON_ROOMS = ["Kitchen", "Living Room", "Bedroom", "Bathroom", "Office", "Garage", "Dining Room", "Guest Bedroom"];

export function NewBoxForm() {
  const router = useRouter();
  const [room, setRoom] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [fragile, setFragile] = useState(false);
  const [quickFragile, setQuickFragile] = useState(false);
  const [showFullForm, setShowFullForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const suggestion = useMemo(() => suggestRoomCode(room), [room]);

  async function createBox(payload: Record<string, unknown>, mode: "full" | "quick") {
    setSaving(true);
    setFormError(null);

    const res = await fetch("/api/boxes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setFormError(typeof body.error === "string" ? body.error : "Could not create box. Try again.");
      setSaving(false);
      return;
    }

    const box = await res.json();
    trackBoxCreate(box.id, mode);
    router.push(`/boxes/${box.id}`);
    router.refresh();
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const raw = Object.fromEntries(formData.entries()) as Record<string, unknown>;
    const payload = {
      ...raw,
      roomCode: String(roomCode || suggestion),
      fragile
    };
    await createBox(payload, "full");
  }

  async function quickCreate(roomName: string) {
    if (saving) return;
    trackQuickCreateTap(roomName);
    await createBox(buildQuickBoxPayload(roomName, { fragile: quickFragile }), "quick");
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <section className="card p-4 space-y-3" style={{ background: "linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)", borderColor: "#bfdbfe" }}>
        <div>
          <h2 className="font-semibold text-slate-800">Quick Create (10 sec)</h2>
          <p className="text-sm text-slate-600 mt-1">Tap a room to create a box instantly with smart defaults.</p>
        </div>

        <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
          {COMMON_ROOMS.map((roomName) => (
            <button
              key={`quick-${roomName}`}
              type="button"
              className="btn"
              style={{ minHeight: "2.85rem", fontWeight: 600 }}
              onClick={() => quickCreate(roomName)}
              aria-label={`Quick create box in ${roomName}`}
              disabled={saving}
            >
              {saving ? "Creating..." : roomName}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700 w-fit">
          <input
            type="checkbox"
            checked={quickFragile}
            onChange={(e) => setQuickFragile(e.target.checked)}
            aria-label="Mark quick-created boxes as fragile"
          />
          Mark quick-created boxes as fragile
        </label>
      </section>

      {formError && (
        <div className="card p-3 text-sm text-red-700 bg-red-50 border-red-200" role="alert" aria-live="assertive">
          {formError}
        </div>
      )}

      <div className="card p-3">
        <button
          type="button"
          className="btn w-full sm:w-auto"
          onClick={() => setShowFullForm((v) => !v)}
          aria-expanded={showFullForm}
          aria-controls="full-box-form"
        >
          {showFullForm ? "Hide full form" : "Need more details? Open full form"}
        </button>
      </div>

      {showFullForm && (
        <div id="full-box-form" className="space-y-4">
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
        </div>
      )}
    </form>
  );
}
