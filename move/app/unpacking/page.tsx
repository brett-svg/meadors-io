import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";

export default async function UnpackingPage() {
  await requireUser();

  const [delivered, unpacked, queue] = await Promise.all([
    prisma.box.count({ where: { status: "delivered" } }),
    prisma.box.count({ where: { status: "unpacked" } }),
    prisma.box.findMany({ where: { status: "delivered" }, orderBy: { updatedAt: "desc" }, include: { items: true } })
  ]);

  const totalDone = delivered + unpacked;
  const pct = totalDone ? Math.round((unpacked / totalDone) * 100) : 0;

  return (
    <main className="space-y-4">
      <section className="card p-4">
        <h1 className="text-xl font-semibold">Unpacking Progress Mode</h1>
        <div className="text-sm text-slate-600 mt-1">Progress: {pct}% ({unpacked}/{totalDone})</div>
      </section>
      <section className="card p-4 space-y-2">
        {queue.length === 0 ? (
          <div className="text-sm text-slate-600">No delivered boxes waiting to unpack.</div>
        ) : (
          queue.map((box) => (
            <Link className="card p-3 block" href={`/boxes/${box.id}`} key={box.id}>
              <div className="flex justify-between"><strong>{box.roomCode}</strong><span>{box.shortCode}</span></div>
              <div className="text-sm">{box.room}{box.zone ? ` / ${box.zone}` : ""} • {box.items.length} items</div>
            </Link>
          ))
        )}
      </section>
    </main>
  );
}
