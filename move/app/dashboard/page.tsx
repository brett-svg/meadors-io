import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { SearchPanel } from "@/components/search-panel";
import { PwaRegister } from "@/components/pwa-register";

function statusLabel(s: string) {
  const map: Record<string, string> = {
    draft: "Draft",
    packed: "Packed",
    in_transit: "In Transit",
    delivered: "Delivered",
    unpacked: "Unpacked"
  };
  return map[s] ?? s;
}

function statusClass(s: string) {
  const map: Record<string, string> = {
    draft: "status-draft",
    packed: "status-packed",
    in_transit: "status-transit",
    delivered: "status-delivered",
    unpacked: "status-unpacked"
  };
  return map[s] ?? "status-draft";
}

function statusIcon(s: string) {
  const map: Record<string, string> = {
    draft: "✏️",
    packed: "📦",
    in_transit: "🚛",
    delivered: "✅",
    unpacked: "🏠"
  };
  return map[s] ?? "📦";
}

export default async function DashboardPage() {
  await requireUser();

  const [counts, recentBoxes] = await Promise.all([
    prisma.box.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.box.findMany({
      orderBy: { updatedAt: "desc" },
      take: 12,
      include: { items: true }
    })
  ]);

  const total = counts.reduce((acc, c) => acc + c._count._all, 0);
  const draft = counts.find((c) => c.status === "draft")?._count._all || 0;
  const packed = counts.find((c) => c.status === "packed")?._count._all || 0;
  const inTransit = counts.find((c) => c.status === "in_transit")?._count._all || 0;
  const delivered = counts.find((c) => c.status === "delivered")?._count._all || 0;
  const unpacked = counts.find((c) => c.status === "unpacked")?._count._all || 0;
  const progress = total ? Math.round((unpacked / total) * 100) : 0;

  // Determine what the user should do next
  let nextAction: { label: string; href: string; desc: string } | null = null;
  if (delivered > 0) {
    nextAction = { label: "Unpack boxes", href: "/unpacking", desc: `${delivered} box${delivered > 1 ? "es" : ""} waiting to be unpacked` };
  } else if (inTransit > 0) {
    nextAction = { label: "Scan arrivals", href: "/scan", desc: `${inTransit} box${inTransit > 1 ? "es" : ""} in transit — scan them as they arrive` };
  } else if (packed > 0) {
    nextAction = { label: "View packed boxes", href: "/labels", desc: `${packed} box${packed > 1 ? "es" : ""} packed and ready to label` };
  } else if (total === 0) {
    nextAction = { label: "Create your first box", href: "/boxes/new", desc: "Start packing by creating a box" };
  }

  return (
    <main className="space-y-4">
      <PwaRegister />

      {/* Progress banner */}
      {total > 0 && (
        <section className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="font-semibold text-lg">Move Progress</div>
              <div className="text-sm text-slate-500">{unpacked} of {total} boxes unpacked</div>
            </div>
            <div className="text-3xl font-bold text-sky-700">{progress}%</div>
          </div>
          <div className="progress-bar">
            <div
              className={`progress-fill ${progress === 100 ? "progress-fill-complete" : ""}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          {progress === 100 && (
            <div className="mt-2 text-sm text-emerald-700 font-medium">🎉 You're all unpacked!</div>
          )}
        </section>
      )}

      {/* Stats */}
      <section className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: "Draft", value: draft, icon: "✏️", cls: "status-draft" },
          { label: "Packed", value: packed, icon: "📦", cls: "status-packed" },
          { label: "In Transit", value: inTransit, icon: "🚛", cls: "status-transit" },
          { label: "Delivered", value: delivered, icon: "✅", cls: "status-delivered" },
          { label: "Unpacked", value: unpacked, icon: "🏠", cls: "status-unpacked" }
        ].map(({ label, value, icon, cls }) => (
          <div key={label} className="card p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-base">{icon}</span>
              <span className="text-xs text-slate-500 font-medium">{label}</span>
            </div>
            <div className={`text-2xl font-bold ${value > 0 ? "" : "text-slate-300"}`}>{value}</div>
          </div>
        ))}
      </section>

      {/* Next action callout */}
      {nextAction && (
        <section className="card p-4 flex items-center justify-between gap-3" style={{ background: "linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)", borderColor: "#bfdbfe" }}>
          <div>
            <div className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-0.5">What to do next</div>
            <div className="font-semibold">{nextAction.label}</div>
            <div className="text-sm text-slate-500">{nextAction.desc}</div>
          </div>
          <Link href={nextAction.href} className="btn btn-primary whitespace-nowrap" style={{ flexShrink: 0 }}>
            Go →
          </Link>
        </section>
      )}

      <SearchPanel />

      {/* Recent boxes */}
      <section className="card p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="font-semibold">Recent Boxes</h2>
          <div className="flex gap-2 text-sm flex-wrap">
            <a className="btn" href="/api/exports/master-index">📄 Master Index</a>
            <a className="btn" href="/api/exports/insurance?format=pdf">🛡️ Insurance PDF</a>
          </div>
        </div>
        {recentBoxes.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <div className="text-4xl mb-2">📦</div>
            <div className="font-medium">No boxes yet</div>
            <div className="text-sm mt-1">
              <Link href="/boxes/new" className="text-sky-600 underline">Create your first box</Link> to get started
            </div>
          </div>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {recentBoxes.map((box) => (
              <Link
                className="card card-hover p-3 block"
                key={box.id}
                href={`/boxes/${box.id}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">{box.roomCode}</span>
                    {box.fragile && <span className="fragile-badge">⚠️ Fragile</span>}
                  </div>
                  <span className={`status-badge ${statusClass(box.status)}`}>
                    {statusIcon(box.status)} {statusLabel(box.status)}
                  </span>
                </div>
                <div className="text-sm text-slate-600">{box.room}{box.zone ? ` · ${box.zone}` : ""}</div>
                <div className="flex items-center justify-between mt-1">
                  <div className="text-xs text-slate-400">{box.items.length} item{box.items.length !== 1 ? "s" : ""}</div>
                  <div className="text-xs text-slate-400">{box.shortCode}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
