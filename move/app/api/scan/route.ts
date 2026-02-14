import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserForApi } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    await requireUserForApi();
    const body = await request.json();
    const raw = String(body.value || "").trim();
    const shortCode = raw.includes("/box/") ? raw.split("/box/").pop() : raw;
    if (!shortCode) return NextResponse.json({ error: "No code" }, { status: 400 });

    const box = await prisma.box.findUnique({ where: { shortCode }, include: { items: true, photos: true } });
    if (!box) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(box);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
