import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserForApi } from "@/lib/auth/session";

export async function GET() {
  try {
    await requireUserForApi();
    const bundles = await prisma.bundle.findMany({ orderBy: { updatedAt: "desc" } });
    return NextResponse.json(bundles);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    await requireUserForApi();
    const body = await request.json();
    const bundle = await prisma.bundle.upsert({
      where: { name: body.name },
      update: { itemsJson: body.itemsJson || [] },
      create: { name: body.name, itemsJson: body.itemsJson || [] }
    });
    return NextResponse.json(bundle);
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 400 });
  }
}
