import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { RoomsManagerClient } from "@/components/rooms-manager-client";

export default async function RoomsPage() {
  await requireUser();

  const boxes = await prisma.box.findMany({
    orderBy: [{ room: "asc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      room: true,
      roomCode: true,
      shortCode: true,
      zone: true,
      status: true,
      fragile: true,
      updatedAt: true,
      _count: { select: { items: true } }
    }
  });

  return <RoomsManagerClient initialBoxes={boxes} />;
}
