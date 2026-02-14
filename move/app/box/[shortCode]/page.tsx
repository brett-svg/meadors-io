import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { BoxLandingClient } from "@/components/box-landing-client";

export default async function BoxByShortCodePage({ params }: { params: Promise<{ shortCode: string }> }) {
  await requireUser();
  const { shortCode } = await params;
  const box = await prisma.box.findUnique({ where: { shortCode }, include: { items: true } });
  if (!box) notFound();

  return (
    <main className="max-w-lg mx-auto">
      <BoxLandingClient box={box} />
    </main>
  );
}
