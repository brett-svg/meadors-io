import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserForApi } from "@/lib/auth/session";
import { pdf_provider } from "@/lib/exports/providers";
import { getBaseUrl } from "@/lib/utils/base-url";

/**
 * GET /api/exports/label/:boxId
 *
 * One-click label PDF for a single box. Uses the first non-Avery label size
 * (Generic 2x3 inch) as the default, or the labelSizeId query param if provided.
 *
 * ?labelSizeId=xxx   optional – override label size
 * ?template=xxx      optional – override template (default: standard_inventory)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUserForApi();
    const { id } = await params;
    const url = new URL(request.url);
    const templateParam = url.searchParams.get("template") ?? "standard_inventory";
    const labelSizeIdParam = url.searchParams.get("labelSizeId");

    const box = await prisma.box.findUnique({ where: { id }, include: { items: true } });
    if (!box) return NextResponse.json({ error: "Box not found" }, { status: 404 });

    // Pick label size: explicit param → first non-Avery preset → any preset
    let labelSize = null;
    if (labelSizeIdParam) {
      labelSize = await prisma.labelSize.findUnique({ where: { id: labelSizeIdParam } });
    }
    if (!labelSize) {
      labelSize = await prisma.labelSize.findFirst({
        where: { isPreset: true, isAvery5160Sheet: false },
        orderBy: { createdAt: "asc" }
      });
    }
    if (!labelSize) {
      labelSize = await prisma.labelSize.findFirst({ where: { isPreset: true } });
    }
    if (!labelSize) {
      return NextResponse.json({ error: "No label sizes configured. Visit /labels to set one up." }, { status: 400 });
    }

    const baseUrl = getBaseUrl(request);
    const pdf = await pdf_provider.exportPDF({
      boxes: [box] as any,
      template: templateParam as any,
      labelSize,
      baseUrl
    });

    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename=${box.shortCode}-label.pdf`
      }
    });
  } catch {
    return NextResponse.json({ error: "Failed to generate label" }, { status: 500 });
  }
}
