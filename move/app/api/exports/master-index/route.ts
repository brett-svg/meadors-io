import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { requireUserForApi } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    await requireUserForApi();
    const boxes = await prisma.box.findMany({ include: { items: true }, orderBy: [{ roomCode: "asc" }, { shortCode: "asc" }] });

    const grouped = boxes.reduce((acc: Record<string, typeof boxes>, box) => {
      acc[box.roomCode] = acc[box.roomCode] || [];
      acc[box.roomCode].push(box);
      return acc;
    }, {});

    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    let page = pdf.addPage([612, 792]);
    let y = 760;

    page.drawText("Master Box Index", { x: 40, y, size: 20, font });
    y -= 28;

    for (const [roomCode, list] of Object.entries(grouped)) {
      if (y < 100) {
        page = pdf.addPage([612, 792]);
        y = 760;
      }
      page.drawText(`${roomCode} (${list.length} boxes)`, { x: 40, y, size: 14, font });
      y -= 18;
      for (const box of list) {
        const topItems = box.items.slice(0, 3).map((item) => `${item.name} x${item.qty}`).join("; ");
        page.drawText(`${box.shortCode} - ${box.room}${box.zone ? ` / ${box.zone}` : ""} - ${topItems}`, { x: 56, y, size: 10, font });
        y -= 14;
        if (y < 70) {
          page = pdf.addPage([612, 792]);
          y = 760;
        }
      }
      y -= 6;
    }

    return new NextResponse(Buffer.from(await pdf.save()), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=master-index.pdf"
      }
    });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 400 });
  }
}
