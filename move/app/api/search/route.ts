import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserForApi } from "@/lib/auth/session";

export async function GET(request: Request) {
  try {
    await requireUserForApi();
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    if (!q) return NextResponse.json([]);

    const boxes = await prisma.box.findMany({
      where: {
        OR: [
          { room: { contains: q, mode: "insensitive" } },
          { zone: { contains: q, mode: "insensitive" } },
          { roomCode: { contains: q, mode: "insensitive" } },
          { shortCode: { contains: q, mode: "insensitive" } },
          {
            items: {
              some: {
                OR: [{ name: { contains: q, mode: "insensitive" } }, { tags: { hasSome: [q] } }]
              }
            }
          }
        ]
      },
      include: { items: true }
    });

    const results = boxes.flatMap((box) => {
      const itemMatches = box.items.filter(
        (item) =>
          item.name.toLowerCase().includes(q.toLowerCase()) || item.tags.some((tag) => tag.toLowerCase().includes(q.toLowerCase()))
      );
      if (itemMatches.length === 0) {
        return [{ type: "box", boxId: box.id, shortCode: box.shortCode, room: box.room, zone: box.zone }];
      }
      return itemMatches.map((item) => ({
        type: "item",
        item: item.name,
        boxId: box.id,
        shortCode: box.shortCode,
        room: box.room,
        zone: box.zone
      }));
    });

    return NextResponse.json(results);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
