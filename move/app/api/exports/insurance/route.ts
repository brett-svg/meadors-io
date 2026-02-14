import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { requireUserForApi } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  try {
    await requireUserForApi();
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "csv";
    const boxes = await prisma.box.findMany({ orderBy: { estimatedValue: "desc" } });

    if (format === "pdf") {
      const pdf = await PDFDocument.create();
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      const page = pdf.addPage([612, 792]);
      page.drawText("Insurance Summary", { x: 40, y: 760, size: 20, font });
      let y = 730;
      for (const box of boxes.slice(0, 35)) {
        page.drawText(
          `${box.shortCode} | condition: ${box.condition} | estimated value: ${box.estimatedValue || "0"} | damage: ${box.damageNotes || "-"}`,
          { x: 40, y, size: 10, font }
        );
        y -= 16;
      }
      return new NextResponse(Buffer.from(await pdf.save()), {
        headers: { "Content-Type": "application/pdf", "Content-Disposition": "attachment; filename=insurance-summary.pdf" }
      });
    }

    const header = "short_code,condition,damage_notes,estimated_value,room,zone";
    const rows = boxes.map((b) => [b.shortCode, b.condition, b.damageNotes || "", b.estimatedValue || "", b.room, b.zone || ""]);
    const csv = [header, ...rows.map((row) => row.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(","))].join("\n");

    return new NextResponse(csv, {
      headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=insurance.csv" }
    });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 400 });
  }
}
