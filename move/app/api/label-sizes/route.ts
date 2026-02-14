import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserForApi } from "@/lib/auth/session";

export async function GET() {
  try {
    await requireUserForApi();
    const rows = await prisma.labelSize.findMany({ orderBy: [{ isPreset: "desc" }, { name: "asc" }] });
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    await requireUserForApi();
    const body = await request.json();
    const row = await prisma.labelSize.create({
      data: {
        name: body.name,
        widthMm: Number(body.widthMm),
        heightMm: Number(body.heightMm),
        orientation: body.orientation || "portrait",
        marginTopMm: Number(body.marginTopMm || 0),
        marginRightMm: Number(body.marginRightMm || 0),
        marginBottomMm: Number(body.marginBottomMm || 0),
        marginLeftMm: Number(body.marginLeftMm || 0),
        safePaddingMm: Number(body.safePaddingMm || 0),
        cornerRadiusMm: body.cornerRadiusMm ? Number(body.cornerRadiusMm) : null,
        isPreset: false,
        isAvery5160Sheet: false
      }
    });
    return NextResponse.json(row, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 400 });
  }
}
