import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserForApi } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    await requireUserForApi();
    const { oldName, newName } = await request.json();
    if (!oldName || !newName || !newName.trim()) {
      return NextResponse.json({ error: "oldName and newName required" }, { status: 400 });
    }
    const { count } = await prisma.box.updateMany({
      where: { room: oldName },
      data: { room: newName.trim() }
    });
    return NextResponse.json({ ok: true, count });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
