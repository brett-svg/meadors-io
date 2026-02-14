import { prisma } from "@/lib/db/prisma";

export async function generateShortCode() {
  const latest = await prisma.box.findFirst({
    orderBy: { createdAt: "desc" },
    select: { shortCode: true }
  });

  const current = latest?.shortCode?.match(/BX-(\d+)/)?.[1];
  const next = (current ? Number(current) : 0) + 1;
  return `BX-${String(next).padStart(6, "0")}`;
}
