import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserForApi } from "@/lib/auth/session";
import { generateShortCode } from "@/lib/utils/short-code";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUserForApi();
    const { id } = await params;

    const source = await prisma.box.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!source) {
      return NextResponse.json({ error: "Box not found." }, { status: 404 });
    }

    let shortCode = await generateShortCode();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const duplicated = await prisma.box.create({
          data: {
            shortCode,
            house: source.house,
            floor: source.floor,
            room: source.room,
            zone: source.zone,
            roomCode: source.roomCode,
            category: source.category,
            priority: source.priority,
            fragile: source.fragile,
            status: source.status,
            notes: source.notes,
            condition: source.condition,
            damageNotes: source.damageNotes,
            estimatedValue: source.estimatedValue,
            storageArea: source.storageArea,
            storageShelf: source.storageShelf,
            items: {
              create: source.items.map((item) => ({
                name: item.name,
                qty: item.qty,
                packed: item.packed,
                tags: item.tags
              }))
            }
          },
          include: { items: true, photos: true }
        });

        return NextResponse.json(duplicated, { status: 201 });
      } catch (error: any) {
        if (error.code === "P2002") {
          shortCode = await generateShortCode();
          continue;
        }
        throw error;
      }
    }

    return NextResponse.json({ error: "Could not generate unique short code." }, { status: 500 });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: error.message || "Failed to duplicate box." }, { status: 400 });
  }
}
