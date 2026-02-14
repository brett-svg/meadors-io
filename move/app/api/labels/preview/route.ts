import { NextResponse } from "next/server";
import { computeLabelLayout } from "@/lib/labels/engine";
import { prisma } from "@/lib/db/prisma";
import { requireUserForApi } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    await requireUserForApi();
    const body = await request.json();
    const size = body.labelSizeId
      ? await prisma.labelSize.findUnique({ where: { id: body.labelSizeId } })
      : body.labelSize;

    if (!size) return NextResponse.json({ error: "Label size not found" }, { status: 404 });

    const layout = computeLabelLayout(size as any, body.data, body.template || "standard_inventory");
    return NextResponse.json(layout);
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 400 });
  }
}
