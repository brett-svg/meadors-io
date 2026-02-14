import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserForApi } from "@/lib/auth/session";
import { generateShortCode } from "@/lib/utils/short-code";
import { suggestRoomCode } from "@/lib/auth/room-code";

export async function GET() {
  try {
    await requireUserForApi();
    const boxes = await prisma.box.findMany({ orderBy: { createdAt: "desc" }, include: { items: true, photos: true } });
    return NextResponse.json(boxes);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    await requireUserForApi();
    const body = await request.json();

    const existingCodes = await prisma.box.findMany({ select: { roomCode: true } });
    const roomCode = body.roomCode?.trim() || suggestRoomCode(body.room || "", existingCodes.map((x) => x.roomCode).filter((c): c is string => c != null));

    let shortCode = await generateShortCode();
    for (let i = 0; i < 5; i += 1) {
      try {
        const box = await prisma.box.create({
          data: {
            shortCode,
            house: body.house || "House",
            floor: body.floor || "Main",
            room: body.room || "Room",
            zone: body.zone || null,
            roomCode,
            category: body.category || null,
            priority: body.priority || "medium",
            fragile: Boolean(body.fragile),
            status: body.status || "draft",
            notes: body.notes || null,
            condition: body.condition || "ok",
            damageNotes: body.damageNotes || null,
            estimatedValue: body.estimatedValue ? String(body.estimatedValue) : null,
            storageArea: body.storageArea || null,
            storageShelf: body.storageShelf || null
          }
        });
        return NextResponse.json(box, { status: 201 });
      } catch (error: any) {
        if (error.code === "P2002") {
          shortCode = await generateShortCode();
          continue;
        }
        throw error;
      }
    }

    return NextResponse.json({ error: "Could not generate unique short code" }, { status: 500 });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: error.message || "Failed to create box" }, { status: 400 });
  }
}
