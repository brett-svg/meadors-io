import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserForApi } from "@/lib/auth/session";
import { csv_provider, supvan_provider, flashlabel_provider } from "@/lib/exports/providers";

export async function POST(request: Request) {
  try {
    await requireUserForApi();
    const body = await request.json();
    const boxes = await prisma.box.findMany({ where: { id: { in: body.boxIds || [] } } });
    const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

    const provider = body.provider === "supvan" ? supvan_provider : body.provider === "flashlabel" ? flashlabel_provider : csv_provider;
    const csv = provider.exportCSV({ boxes, baseUrl } as any);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=boxes-${Date.now()}.csv`
      }
    });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 400 });
  }
}
