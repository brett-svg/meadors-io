"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type ScannerState = "idle" | "running" | "blocked";

export function ScanClient() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [state, setState] = useState<ScannerState>("idle");
  const [manualCode, setManualCode] = useState("");
  const [box, setBox] = useState<any>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: number | null = null;

    async function start() {
      if (!("BarcodeDetector" in window)) {
        setState("blocked");
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
        setState("running");

        timer = window.setInterval(async () => {
          if (!videoRef.current) return;
          const codes = await detector.detect(videoRef.current);
          if (codes?.length) {
            await lookup(codes[0].rawValue);
          }
        }, 700);
      } catch {
        setState("blocked");
      }
    }

    start();
    return () => {
      if (timer) clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function lookup(value: string) {
    const res = await fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value })
    });
    if (res.ok) setBox(await res.json());
  }

  async function quickStatus(status: string) {
    if (!box) return;
    const res = await fetch(`/api/boxes/${box.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...box, status })
    });
    if (res.ok) setBox(await res.json());
  }

  async function quickAddItem() {
    if (!box) return;
    const name = prompt("Item name");
    if (!name) return;
    const res = await fetch(`/api/boxes/${box.id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, qty: 1, packed: true, tags: [] })
    });
    if (res.ok) {
      const items = await res.json();
      setBox({ ...box, items });
    }
  }

  return (
    <div className="space-y-4">
      <section className="card p-4">
        <h1 className="text-xl font-semibold">Scan Labels</h1>
        <p className="text-sm text-slate-600">Camera permissions are requested once. If blocked, use manual short code/URL input.</p>
      </section>

      <section className="card p-4 space-y-2">
        <video className="w-full rounded bg-black/80 max-h-[320px]" ref={videoRef} muted playsInline />
        <div className="text-sm">Scanner status: {state}</div>
        <div className="flex gap-2">
          <input className="field" value={manualCode} onChange={(e) => setManualCode(e.target.value)} placeholder="Paste short code or URL" />
          <button className="btn" onClick={() => lookup(manualCode)}>Lookup</button>
        </div>
      </section>

      {box && (
        <section className="card p-4 space-y-2">
          <h2 className="font-semibold">{box.roomCode} • {box.shortCode}</h2>
          <div>{box.room}{box.zone ? ` / ${box.zone}` : ""}</div>
          <div>Status: {box.status}</div>
          <div className="flex gap-2 flex-wrap">
            <button className="btn" onClick={() => quickStatus("delivered")}>Mark delivered</button>
            <button className="btn" onClick={() => quickStatus("unpacked")}>Mark unpacked</button>
            <button className="btn" onClick={quickAddItem}>Quick-add item</button>
            <Link className="btn" href={`/boxes/${box.id}`}>Open detail</Link>
          </div>
        </section>
      )}
    </div>
  );
}
