import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserForApi } from "@/lib/auth/session";
import { suggestRoomCode } from "@/lib/auth/room-code";

function cleanRoom(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function selectBoxes() {
  return prisma.box.findMany({
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
}

function pickRoomCode(inputCode: unknown, targetRoom: string, existingCodes: string[]) {
  const fromInput = typeof inputCode === "string" ? inputCode.trim().toUpperCase() : "";
  if (fromInput) return fromInput.slice(0, 5);
  return suggestRoomCode(targetRoom, existingCodes);
}

export async function GET() {
  try {
    await requireUserForApi();
    const boxes = await selectBoxes();
    return NextResponse.json(boxes);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireUserForApi();
    const body = await request.json();
    const action = typeof body.action === "string" ? body.action : "";

    if (action === "rename") {
      const fromRoom = cleanRoom(body.fromRoom);
      const toRoom = cleanRoom(body.toRoom);
      if (!fromRoom || !toRoom) {
        return NextResponse.json({ error: "Both source and destination rooms are required." }, { status: 400 });
      }

      const existingCodes = await prisma.box.findMany({ select: { roomCode: true } });
      const nextRoomCode = pickRoomCode(body.roomCode, toRoom, existingCodes.map((row) => row.roomCode));

      const result = await prisma.box.updateMany({
        where: { room: fromRoom },
        data: { room: toRoom, roomCode: nextRoomCode }
      });

      const boxes = await selectBoxes();
      return NextResponse.json({ updatedCount: result.count, boxes });
    }

    if (action === "move_boxes") {
      const boxIds = Array.isArray(body.boxIds)
        ? body.boxIds.filter((id: unknown): id is string => typeof id === "string" && id.trim().length > 0)
        : [];
      const toRoom = cleanRoom(body.toRoom);
      if (!toRoom || boxIds.length === 0) {
        return NextResponse.json({ error: "Destination room and at least one box are required." }, { status: 400 });
      }

      const existingCodes = await prisma.box.findMany({ select: { roomCode: true } });
      const nextRoomCode = pickRoomCode(body.roomCode, toRoom, existingCodes.map((row) => row.roomCode));

      const result = await prisma.box.updateMany({
        where: { id: { in: boxIds } },
        data: { room: toRoom, roomCode: nextRoomCode }
      });

      const boxes = await selectBoxes();
      return NextResponse.json({ updatedCount: result.count, boxes });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: error.message || "Failed" }, { status: 400 });
  }
}
