"use client";

import { useMemo, useState } from "react";
import { enqueueWrite, flushQueue } from "@/lib/pwa/queue";

export function BoxDetailClient({ initialBox }: { initialBox: any }) {
  const [box, setBox] = useState(initialBox);
  const [itemName, setItemName] = useState("");
  const [bulkInput, setBulkInput] = useState("");

  const qrUrl = useMemo(() => {
    if (typeof window === "undefined") return `/box/${box.shortCode}`;
    return `${window.location.origin}/box/${box.shortCode}`;
  }, [box.shortCode]);

  async function patchBox(patch: Record<string, unknown>) {
    const payload = { ...box, ...patch };
    try {
      const res = await fetch(`/api/boxes/${box.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) setBox(await res.json());
    } catch {
      enqueueWrite({
        id: crypto.randomUUID(),
        url: `/api/boxes/${box.id}`,
        method: "PATCH",
        body: JSON.stringify(payload)
      });
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
      setBox({ ...box, photos: [...box.photos, photo] });
    }
  }

  return (
    <div className="space-y-4">
      <section className="card p-4 grid md:grid-cols-2 gap-3">
        <div>
          <h1 className="text-2xl font-bold">{box.roomCode}</h1>
          <div className="text-slate-600">{box.shortCode}</div>
          <div className="text-sm mt-2">{box.house} / {box.floor} / {box.room}{box.zone ? ` / ${box.zone}` : ""}</div>
          <div className="mt-2 text-sm">QR URL: <code>{qrUrl}</code></div>
        </div>
        <div className="space-y-2">
          <button className="btn" onClick={() => flushQueue()}>Sync queued offline writes</button>
          <label className="text-sm">Status</label>
          <select className="field" value={box.status} onChange={(e) => patchBox({ status: e.target.value })}>
            <option value="draft">draft</option>
            <option value="packed">packed</option>
            <option value="in_transit">in_transit</option>
            <option value="delivered">delivered</option>
            <option value="unpacked">unpacked</option>
          </select>
          <div className="flex gap-2">
            <button className="btn" onClick={() => patchBox({ status: "delivered" })}>Mark delivered</button>
            <button className="btn" onClick={() => patchBox({ status: "unpacked" })}>Mark unpacked</button>
          </div>
        </div>
      </section>

      <section className="card p-4">
        <h2 className="font-semibold">Inventory</h2>
        <div className="flex gap-2 mt-2">
          <input className="field" placeholder="Item name" value={itemName} onChange={(e) => setItemName(e.target.value)} />
          <button className="btn" onClick={addItem}>Add</button>
        </div>
        <textarea className="field mt-2" rows={3} placeholder="Bulk add: plates x 8, usb cable (3), toothbrush" value={bulkInput} onChange={(e) => setBulkInput(e.target.value)} />
        <button className="btn mt-2" onClick={addBulk}>Bulk add parser</button>
        <div className="mt-3 space-y-2">
          {box.items.map((item: any) => (
            <div key={item.id} className="card p-2 flex items-center justify-between">
              <div>{item.name} x{item.qty}</div>
              <button className="btn" onClick={() => removeItem(item.id)}>Remove</button>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-4">
        <h2 className="font-semibold">Photos</h2>
        <input className="field mt-2" type="file" accept="image/*" onChange={(e) => uploadPhoto(e.target.files?.[0] || null)} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
          {box.photos.map((photo: any) => (
            <img key={photo.id} src={photo.url} alt={photo.caption || "photo"} className="w-full h-28 object-cover rounded" />
          ))}
        </div>
      </section>
    </div>
  );
}
