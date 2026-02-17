import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { RoomsClient } from "@/components/rooms-client";

export default async function RoomsPage() {
  await requireUser();

  const boxes = await prisma.box.findMany({
    select: {
      id: true,
      room: true,
      floor: true,
      house: true,
      status: true,
      fragile: true,
      items: { select: { id: true } }
    },
    orderBy: { room: "asc" }
  });

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold">Rooms</h1>
      </div>
      <RoomsClient boxes={boxes} />
    </main>
  );
}
