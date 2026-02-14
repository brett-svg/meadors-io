import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserForApi } from "@/lib/auth/session";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUserForApi();
    const { id } = await params;
    const box = await prisma.box.findUnique({ where: { id }, include: { items: true, photos: true } });
    if (!box) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(box);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUserForApi();
    const { id } = await params;
    const body = await request.json();

    const box = await prisma.box.update({
      where: { id },
      data: {
        house: body.house,
        floor: body.floor,
        room: body.room,
        zone: body.zone,
        roomCode: body.roomCode,
        category: body.category,
        priority: body.priority,
        fragile: body.fragile,
        status: body.status,
        notes: body.notes,
        condition: body.condition,
        damageNotes: body.damageNotes,
        estimatedValue: body.estimatedValue ? String(body.estimatedValue) : null,
        storageArea: body.storageArea,
        storageShelf: body.storageShelf
      }
    });

    return NextResponse.json(box);
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: error.message || "Failed" }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUserForApi();
    const { id } = await params;
    await prisma.box.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 400 });
  }
}
