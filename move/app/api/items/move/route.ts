import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserForApi } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    await requireUserForApi();
    const body = await request.json();
    const itemId = typeof body.itemId === "string" ? body.itemId : "";
    const targetBoxId = typeof body.targetBoxId === "string" ? body.targetBoxId : "";
    const sourceBoxId = typeof body.sourceBoxId === "string" ? body.sourceBoxId : "";

    if (!itemId || !targetBoxId) {
      return NextResponse.json({ error: "itemId and targetBoxId are required." }, { status: 400 });
    }

    const item = await prisma.item.findUnique({ where: { id: itemId }, select: { id: true, boxId: true } });
    if (!item) {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }

    if (sourceBoxId && item.boxId !== sourceBoxId) {
      return NextResponse.json({ error: "Item no longer belongs to this box." }, { status: 409 });
    }

    if (item.boxId === targetBoxId) {
      return NextResponse.json({ error: "Item is already in that box." }, { status: 400 });
    }

    const target = await prisma.box.findUnique({ where: { id: targetBoxId }, select: { id: true } });
    if (!target) {
      return NextResponse.json({ error: "Destination box not found." }, { status: 404 });
    }

    const movedItem = await prisma.item.update({ where: { id: itemId }, data: { boxId: targetBoxId } });
    const sourceItems = await prisma.item.findMany({ where: { boxId: item.boxId }, orderBy: { createdAt: "asc" } });

    return NextResponse.json({ ok: true, movedItem, sourceItems });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: error.message || "Failed to move item." }, { status: 400 });
  }
}
