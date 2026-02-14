import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { Orientation } from "@prisma/client";

// One-time setup route — creates Brett and Lynn accounts.
// Protected by a static token so it can't be called by anyone without access to the env.
// Delete this file once accounts are created.
export async function POST(request: Request) {
  const { token } = await request.json();
  if (token !== process.env.SETUP_TOKEN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const brettHash = await bcrypt.hash("8015", 10);
  await prisma.user.upsert({
    where: { username: "Brett" },
    update: { passwordHash: brettHash },
    create: { username: "Brett", passwordHash: brettHash }
  });

  const lynnHash = await bcrypt.hash("3104", 10);
  await prisma.user.upsert({
    where: { username: "Lynn" },
    update: { passwordHash: lynnHash },
    create: { username: "Lynn", passwordHash: lynnHash }
  });

  // Ensure all label size presets exist (safe to run repeatedly)
  const labelSizes = [
    { id: "avery-5160", name: "Avery 5160", widthMm: 66.675, heightMm: 25.4, orientation: Orientation.landscape, marginTopMm: 2, marginRightMm: 2, marginBottomMm: 2, marginLeftMm: 2, safePaddingMm: 1, isPreset: true, isAvery5160Sheet: true },
    { id: "generic-2x3-inch", name: "Generic 2x3 inch", widthMm: 76.2, heightMm: 50.8, orientation: Orientation.landscape, marginTopMm: 1, marginRightMm: 1, marginBottomMm: 1, marginLeftMm: 1, safePaddingMm: 1, isPreset: true },
    { id: "supvan-50x30", name: "Supvan 50x30", widthMm: 50, heightMm: 30, orientation: Orientation.landscape, marginTopMm: 0.8, marginRightMm: 0.8, marginBottomMm: 0.8, marginLeftMm: 0.8, safePaddingMm: 1, isPreset: true },
    { id: "supvan-50x40", name: "Supvan 50x40", widthMm: 50, heightMm: 40, orientation: Orientation.landscape, marginTopMm: 0.8, marginRightMm: 0.8, marginBottomMm: 0.8, marginLeftMm: 0.8, safePaddingMm: 1, isPreset: true },
    { id: "flashlabel-40x30", name: "FlashLabel 40x30", widthMm: 40, heightMm: 30, orientation: Orientation.landscape, marginTopMm: 1, marginRightMm: 1, marginBottomMm: 1, marginLeftMm: 1, safePaddingMm: 1, isPreset: true },
    { id: "4x6-inch-(inventory)", name: "4x6 inch (inventory)", widthMm: 152.4, heightMm: 101.6, orientation: Orientation.landscape, marginTopMm: 3, marginRightMm: 3, marginBottomMm: 3, marginLeftMm: 3, safePaddingMm: 2, isPreset: true },
  ];
  for (const size of labelSizes) {
    await prisma.labelSize.upsert({ where: { id: size.id }, update: size, create: size });
  }

  return NextResponse.json({ ok: true, users: ["Brett", "Lynn"], labelSizes: labelSizes.map(s => s.id) });
}
