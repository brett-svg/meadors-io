import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { BoxDetailClient } from "@/components/box-detail-client";

export default async function BoxDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const box = await prisma.box.findUnique({ where: { id }, include: { items: true, photos: true } });
  if (!box) notFound();

  return <BoxDetailClient initialBox={box} />;
}
