"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Result = {
  type: "item" | "box";
  item?: string;
  boxId: string;
  shortCode: string;
  room: string;
  zone?: string;
};

export function SearchPanel() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) setResults(await res.json());
    }, 150);
    return () => clearTimeout(timeout);
  }, [q]);

  return (
    <section className="card p-4">
      <h2 className="font-semibold mb-2">Instant Search</h2>
      <input className="field" placeholder="Search items, tags, room, zone, room code, short code" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mt-3 space-y-2 text-sm">
        {results.map((r, idx) => (
          <div className="card p-2" key={`${r.boxId}-${idx}`}>
            <div>
              {r.item ? <span className="font-medium">{r.item}</span> : <span className="font-medium">Box match</span>} in {r.shortCode}
            </div>
            <div className="text-slate-600">
              {r.room}
              {r.zone ? ` / ${r.zone}` : ""}
            </div>
            <Link className="text-sky-700" href={`/boxes/${r.boxId}`}>
              Open box
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
