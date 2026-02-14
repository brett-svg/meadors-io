import { getBaseUrl } from "@/lib/utils/base-url";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserForApi } from "@/lib/auth/session";
import { png_provider, supvan_provider, flashlabel_provider } from "@/lib/exports/providers";

export async function POST(request: Request) {
  try {
    await requireUserForApi();
    const body = await request.json();
    const boxes = await prisma.box.findMany({ where: { id: { in: body.boxIds || [] } } });
    const labelSize = await prisma.labelSize.findUnique({ where: { id: body.labelSizeId } });
    if (!labelSize) return NextResponse.json({ error: "Label size not found" }, { status: 404 });

    const baseUrl = getBaseUrl(request);
    const ctx = {
      boxes: boxes as any,
      template: body.template || "standard_inventory",
      labelSize,
      baseUrl,
      dpi: Number(body.dpi || 300)
    };

    const provider = body.provider === "supvan" ? supvan_provider : body.provider === "flashlabel" ? flashlabel_provider : png_provider;
    const data = await provider.exportPNG(ctx as any);
    const isZip = boxes.length > 1;

    return new NextResponse(data, {
      headers: {
        "Content-Type": isZip ? "application/zip" : "image/png",
        "Content-Disposition": `attachment; filename=labels-${Date.now()}.${isZip ? "zip" : "png"}`
      }
    });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 400 });
  }
}
