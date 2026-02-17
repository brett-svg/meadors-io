import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { BoxList } from "@/components/box-list";

export default async function BoxesPage() {
  await requireUser();

  const boxes = await prisma.box.findMany({
    orderBy: [{ room: "asc" }, { createdAt: "desc" }],
    include: { items: true }
  });

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold">All Boxes</h1>
        <Link href="/boxes/new" className="btn btn-primary">+ New Box</Link>
      </div>
      <BoxList boxes={boxes} />
    </main>
  );
}
