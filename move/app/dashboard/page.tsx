import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { SearchPanel } from "@/components/search-panel";
import { PwaRegister } from "@/components/pwa-register";

export default async function DashboardPage() {
  await requireUser();

  const [counts, recentBoxes] = await Promise.all([
    prisma.box.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.box.findMany({ orderBy: { updatedAt: "desc" }, take: 12, include: { items: true } })
  ]);

  const total = counts.reduce((acc, c) => acc + c._count._all, 0);
  const delivered = counts.find((c) => c.status === "delivered")?._count._all || 0;
  const unpacked = counts.find((c) => c.status === "unpacked")?._count._all || 0;
  const progress = total ? Math.round((unpacked / total) * 100) : 0;

  return (
    <main className="space-y-4">
      <PwaRegister />
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="card p-3"><div className="text-sm text-slate-500">Total Boxes</div><div className="text-2xl font-bold">{total}</div></div>
        <div className="card p-3"><div className="text-sm text-slate-500">Delivered</div><div className="text-2xl font-bold">{delivered}</div></div>
        <div className="card p-3"><div className="text-sm text-slate-500">Unpacked</div><div className="text-2xl font-bold">{unpacked}</div></div>
        <div className="card p-3"><div className="text-sm text-slate-500">Progress</div><div className="text-2xl font-bold">{progress}%</div></div>
        <div className="card p-3"><div className="text-sm text-slate-500">Unpacking Queue</div><Link href="/unpacking" className="text-sky-700">Open queue</Link></div>
      </section>

      <SearchPanel />

      <section className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Recent boxes</h2>
          <div className="flex gap-2 text-sm">
            <a className="btn" href="/api/exports/master-index">Master index PDF</a>
            <a className="btn" href="/api/exports/insurance">Insurance CSV</a>
            <a className="btn" href="/api/exports/insurance?format=pdf">Insurance PDF</a>
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {recentBoxes.map((box) => (
            <Link className="card p-3" key={box.id} href={`/boxes/${box.id}`}>
              <div className="flex justify-between">
                <strong>{box.roomCode}</strong>
                <span>{box.shortCode}</span>
              </div>
              <div className="text-sm text-slate-600">{box.room}{box.zone ? ` / ${box.zone}` : ""}</div>
              <div className="text-xs mt-1">{box.items.length} items • {box.status}</div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
