import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";

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

  return NextResponse.json({ ok: true, users: ["Brett", "Lynn"] });
}
