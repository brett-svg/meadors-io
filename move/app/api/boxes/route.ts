import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserForApi } from "@/lib/auth/session";
import { generateShortCode } from "@/lib/utils/short-code";
import { suggestRoomCode } from "@/lib/auth/room-code";

type PriorityValue = "low" | "medium" | "high";
type StatusValue = "draft" | "packed" | "in_transit" | "delivered" | "unpacked";
type ConditionValue = "ok" | "damaged";

const VALID_PRIORITY: Record<string, PriorityValue> = {
  low: "low",
  medium: "medium",
  high: "high"
};
const VALID_STATUS: Record<string, StatusValue> = {
  draft: "draft",
  packed: "packed",
  in_transit: "in_transit",
  delivered: "delivered",
  unpacked: "unpacked"
};
const VALID_CONDITION: Record<string, ConditionValue> = {
  ok: "ok",
  damaged: "damaged"
};

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
    const body: Record<string, unknown> = await request.json();

    const existingCodes = await prisma.box.findMany({ select: { roomCode: true } });
    const roomCodeList: string[] = [];
    for (const row of existingCodes) {
      if (typeof row.roomCode === "string") roomCodeList.push(row.roomCode);
    }
    const roomCodeInput = typeof body.roomCode === "string" ? body.roomCode.trim() : "";
    const roomInput = typeof body.room === "string" ? body.room : "";
    const roomCode = roomCodeInput || suggestRoomCode(roomInput, roomCodeList);
    const priority = typeof body.priority === "string" ? VALID_PRIORITY[body.priority] ?? "medium" : "medium";
    const status = typeof body.status === "string" ? VALID_STATUS[body.status] ?? "draft" : "draft";
    const condition = typeof body.condition === "string" ? VALID_CONDITION[body.condition] ?? "ok" : "ok";

    let shortCode = await generateShortCode();
    for (let i = 0; i < 5; i += 1) {
      try {
        const box = await prisma.box.create({
          data: {
            shortCode,
            house: typeof body.house === "string" && body.house ? body.house : "House",
            floor: typeof body.floor === "string" && body.floor ? body.floor : "Main",
            room: typeof body.room === "string" && body.room ? body.room : "Room",
            zone: typeof body.zone === "string" && body.zone ? body.zone : null,
            roomCode,
            category: typeof body.category === "string" && body.category ? body.category : null,
            priority,
            fragile: Boolean(body.fragile),
            status,
            notes: typeof body.notes === "string" && body.notes ? body.notes : null,
            condition,
            damageNotes: typeof body.damageNotes === "string" && body.damageNotes ? body.damageNotes : null,
            estimatedValue: body.estimatedValue ? String(body.estimatedValue) : null,
            storageArea: typeof body.storageArea === "string" && body.storageArea ? body.storageArea : null,
            storageShelf: typeof body.storageShelf === "string" && body.storageShelf ? body.storageShelf : null
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
