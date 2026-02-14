import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserForApi } from "@/lib/auth/session";
import { parseBulkItems } from "@/lib/utils/parse-items";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUserForApi();
    const { id } = await params;
    const body = await request.json();

    if (body.bulkInput) {
      const parsed = parseBulkItems(body.bulkInput);
      await prisma.item.createMany({
        data: parsed.map((item) => ({
          boxId: id,
          name: item.name,
          qty: item.qty,
          packed: true,
          tags: []
        }))
      });
    } else {
      await prisma.item.create({
        data: {
          boxId: id,
          name: body.name,
          qty: Number(body.qty || 1),
          packed: Boolean(body.packed),
          tags: Array.isArray(body.tags) ? body.tags : []
        }
      });
    }

    const items = await prisma.item.findMany({ where: { boxId: id }, orderBy: { createdAt: "asc" } });
    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 400 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUserForApi();
    const { id } = await params;
    const body = await request.json();
    const existing = await prisma.item.findUnique({ where: { id: body.id }, select: { boxId: true } });
    if (!existing || existing.boxId !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const item = await prisma.item.update({
      where: { id: body.id },
      data: {
        name: body.name,
        qty: Number(body.qty || 1),
        packed: Boolean(body.packed),
        tags: Array.isArray(body.tags) ? body.tags : []
      }
    });

    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUserForApi();
    const { id } = await params;
    const body = await request.json();
    const existing = await prisma.item.findUnique({ where: { id: body.id }, select: { boxId: true } });
    if (!existing || existing.boxId !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await prisma.item.delete({ where: { id: body.id } });
    const items = await prisma.item.findMany({ where: { boxId: id }, orderBy: { createdAt: "asc" } });
    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 400 });
  }
}
