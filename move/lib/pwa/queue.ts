export type OfflineWrite = {
  id: string;
  url: string;
  method: string;
  body?: string;
};

const KEY = "offline_write_queue";

export function enqueueWrite(write: OfflineWrite) {
  const existing = readQueue();
  existing.push(write);
  localStorage.setItem(KEY, JSON.stringify(existing));
}

export function readQueue(): OfflineWrite[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export async function flushQueue() {
  const pending = readQueue();
  const failed: OfflineWrite[] = [];

  for (const entry of pending) {
    try {
      const response = await fetch(entry.url, {
        method: entry.method,
        headers: { "Content-Type": "application/json" },
        body: entry.body
      });
      if (!response.ok) failed.push(entry);
    } catch {
      failed.push(entry);
    }
  }

  localStorage.setItem(KEY, JSON.stringify(failed));
  return { synced: pending.length - failed.length, failed: failed.length };
}
