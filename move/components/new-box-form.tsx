"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const map: Record<string, string> = {
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

function suggest(room: string) {
  const key = room.trim().toLowerCase();
  if (map[key]) return map[key];
  const words = room.trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) return words.map((w) => w[0].toUpperCase()).join("").slice(0, 5);
  return (words[0] || "ROOM").slice(0, 5).toUpperCase();
}

export function NewBoxForm() {
  const router = useRouter();
  const [room, setRoom] = useState("");
  const [roomCode, setRoomCode] = useState("");
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
      fragile: formData.get("fragile") === "on"
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
    router.push(`/boxes/${box.id}`);
    router.refresh();
  }

  return (
    <form className="grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
      <input className="field" name="house" placeholder="House" defaultValue="Main House" required />
      <input className="field" name="floor" placeholder="Floor" defaultValue="Main" required />
      <input className="field" name="room" placeholder="Room" required value={room} onChange={(e) => setRoom(e.target.value)} />
      <input className="field" name="zone" placeholder="Zone" />

      <div>
        <input className="field" name="roomCode" placeholder={`Room code (suggested: ${suggestion || "RM"})`} value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())} />
        <div className="text-xs text-slate-500 mt-1">Editable suggestion: {suggestion || "RM"}</div>
      </div>

      <input className="field" name="category" placeholder="Category" />
      <select className="field" name="priority" defaultValue="medium">
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>
      <select className="field" name="status" defaultValue="draft">
        <option value="draft">draft</option>
        <option value="packed">packed</option>
        <option value="in_transit">in_transit</option>
        <option value="delivered">delivered</option>
        <option value="unpacked">unpacked</option>
      </select>
      <label className="flex items-center gap-2"><input type="checkbox" name="fragile" /> Fragile</label>
      <textarea className="field md:col-span-2" name="notes" placeholder="Notes" rows={3} />
      <div className="md:col-span-2">
        <button className="btn btn-primary" disabled={saving} type="submit">{saving ? "Creating..." : "Create Box"}</button>
      </div>
    </form>
  );
}
