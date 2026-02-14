import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { LabelsWorkbench } from "@/components/labels-workbench";

export default async function LabelsPage() {
  await requireUser();
  const boxes = await prisma.box.findMany({ orderBy: { updatedAt: "desc" }, take: 100 });

  return (
    <main className="space-y-4">
      <section className="card p-4">
        <h1 className="text-xl font-semibold">Label Sizes, Templates, and Exports</h1>
        <p className="text-sm text-slate-600 mt-1">Room code is always primary, short code stays readable, and QR minimum size is enforced.</p>
      </section>
      <LabelsWorkbench boxes={boxes} />
    </main>
  );
}
