import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";

export default async function BoxByShortCodePage({ params }: { params: Promise<{ shortCode: string }> }) {
  await requireUser();
  const { shortCode } = await params;
  const box = await prisma.box.findUnique({ where: { shortCode }, include: { items: true } });
  if (!box) notFound();

  return (
    <main className="card p-4 space-y-3">
      <h1 className="text-2xl font-bold">{box.roomCode} • {box.shortCode}</h1>
      <div>{box.room}{box.zone ? ` / ${box.zone}` : ""}</div>
      <div>Status: {box.status}</div>
      <ul className="list-disc ml-5">
        {box.items.map((item) => <li key={item.id}>{item.name} x{item.qty}</li>)}
      </ul>
      <Link href={`/boxes/${box.id}`} className="btn inline-flex">Open full detail</Link>
    </main>
  );
}
