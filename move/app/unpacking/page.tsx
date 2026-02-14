import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

export default async function UnpackingPage() {
  await requireUser();

  const [delivered, unpacked, queue] = await Promise.all([
    prisma.box.count({ where: { status: "delivered" } }),
    prisma.box.count({ where: { status: "unpacked" } }),
    prisma.box.findMany({
      where: { status: "delivered" },
      orderBy: { updatedAt: "desc" },
      include: { items: true }
    })
  ]);

  const totalDone = delivered + unpacked;
  const pct = totalDone ? Math.round((unpacked / totalDone) * 100) : 0;

  // Sort by priority: high first
  const sorted = [...queue].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority ?? "medium"] ?? 1;
    const pb = PRIORITY_ORDER[b.priority ?? "medium"] ?? 1;
    return pa - pb;
  });

  return (
    <main className="space-y-4">
      {/* Progress */}
      <section className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-xl font-semibold">Unpacking Progress</h1>
            <div className="text-sm text-slate-500 mt-0.5">{unpacked} of {totalDone} boxes unpacked</div>
          </div>
          <div className="text-3xl font-bold text-sky-700">{pct}%</div>
        </div>
        <div className="progress-bar">
          <div
            className={`progress-fill ${pct === 100 ? "progress-fill-complete" : ""}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {pct === 100 && totalDone > 0 && (
          <div className="mt-2 text-sm text-emerald-700 font-medium">🎉 All delivered boxes are unpacked!</div>
        )}
      </section>

      {/* Queue */}
      <section className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Boxes to Unpack</h2>
          <span className="text-sm text-slate-500">{delivered} remaining</span>
        </div>

        {sorted.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <div className="text-4xl mb-2">🎉</div>
            <div className="font-medium">Nothing to unpack!</div>
            <div className="text-sm mt-1">All delivered boxes have been unpacked.</div>
          </div>
        ) : (
          <div className="space-y-2">
            {sorted.map((box) => {
              const priority = box.priority ?? "medium";
              const priorityDotClass = `priority-dot priority-${priority}`;
              const priorityLabel = priority === "high" ? "Unpack first" : priority === "low" ? "Unpack whenever" : "";
              return (
                <Link
                  className="card card-hover p-3 block"
                  href={`/boxes/${box.id}`}
                  key={box.id}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={priorityDotClass} />
                      <strong className="text-slate-800">{box.roomCode}</strong>
                      {box.fragile && <span className="fragile-badge">⚠️ Fragile</span>}
                      {priority === "high" && (
                        <span className="text-xs font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full border border-red-200">
                          High priority
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">{box.shortCode}</span>
                  </div>
                  <div className="text-sm text-slate-600 mt-0.5">
                    {box.room}{box.zone ? ` · ${box.zone}` : ""}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {box.items.length} item{box.items.length !== 1 ? "s" : ""}
                    {priorityLabel && <> · {priorityLabel}</>}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
