import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserForApi } from "@/lib/auth/session";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUserForApi();
    const { id } = await params;
    const body = await request.json();

    // Store base64 data URL directly in DB — survives Railway redeploys, no S3 needed.
    const photoUrl = body.base64Image ?? body.url;
    if (!photoUrl) return NextResponse.json({ error: "No image provided" }, { status: 400 });

    const photo = await prisma.photo.create({
      data: { boxId: id, url: photoUrl, caption: body.caption || null }
    });

    return NextResponse.json(photo);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 400 });
  }
}
