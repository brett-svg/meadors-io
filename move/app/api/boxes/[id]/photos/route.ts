import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserForApi } from "@/lib/auth/session";
import path from "path";
import { mkdir, writeFile } from "fs/promises";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUserForApi();
    const { id } = await params;
    const body = await request.json();

    let photoUrl = body.url;
    if (body.base64Image) {
      if (!process.env.S3_ENDPOINT) {
        const data = body.base64Image.replace(/^data:image\/\w+;base64,/, "");
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
        const uploadDir = path.join(process.cwd(), "public", "uploads");
        await mkdir(uploadDir, { recursive: true });
        await writeFile(path.join(uploadDir, fileName), Buffer.from(data, "base64"));
        photoUrl = `/uploads/${fileName}`;
      }
    }

    const photo = await prisma.photo.create({
      data: {
        boxId: id,
        url: photoUrl,
        caption: body.caption || null
      }
    });

    return NextResponse.json({
      ...photo,
      warning: process.env.S3_ENDPOINT ? null : "Using local storage; files are not persistent on Railway redeploys."
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 400 });
  }
}
