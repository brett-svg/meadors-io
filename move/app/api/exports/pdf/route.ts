import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserForApi } from "@/lib/auth/session";
import { pdf_provider, supvan_provider, flashlabel_provider } from "@/lib/exports/providers";

export async function POST(request: Request) {
  try {
    await requireUserForApi();
    const body = await request.json();
    const boxes = await prisma.box.findMany({ where: { id: { in: body.boxIds || [] } } });
    const labelSize = await prisma.labelSize.findUnique({ where: { id: body.labelSizeId } });
    if (!labelSize) return NextResponse.json({ error: "Label size not found" }, { status: 404 });

    const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
    const ctx = { boxes: boxes as any, template: body.template || "standard_inventory", labelSize, baseUrl };
    const provider = body.provider === "supvan" ? supvan_provider : body.provider === "flashlabel" ? flashlabel_provider : pdf_provider;
    const pdf = await provider.exportPDF(ctx as any);

    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=labels-${Date.now()}.pdf`
      }
    });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 400 });
  }
}
