import { Box, LabelSize } from "@prisma/client";
import JSZip from "jszip";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { computeLabelLayout, effectiveSize, makeQrDataUrl, mmToPx } from "@/lib/labels/engine";
import { LabelTemplateKey } from "@/lib/labels/types";

function mmToPt(mm: number) {
  return (mm * 72) / 25.4;
}

type BoxForLabel = Pick<
  Box,
  "id" | "shortCode" | "roomCode" | "room" | "zone" | "priority" | "fragile" | "notes"
>;

type ExportCtx = {
  boxes: BoxForLabel[];
  template: LabelTemplateKey;
  labelSize: LabelSize;
  baseUrl: string;
  dpi?: number;
};

async function renderSinglePng(box: BoxForLabel, template: LabelTemplateKey, labelSize: LabelSize, baseUrl: string, dpi = 300) {
  const { ImageResponse } = await import("next/og");
  const qrUrl = `${baseUrl}/box/${box.shortCode}`;
  const layout = computeLabelLayout(labelSize as any, { ...box, qrUrl }, template);
  const qrData = await makeQrDataUrl(qrUrl);
  const { widthMm, heightMm } = effectiveSize(labelSize as any);

  const width = mmToPx(widthMm, dpi);
  const height = mmToPx(heightMm, dpi);

  const image = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          border: "2px solid #0f172a",
          boxSizing: "border-box",
          padding: "14px",
          fontFamily: "Arial",
          justifyContent: "space-between"
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: "62%" }}>
          <div style={{ fontSize: layout.roomCodeFontPx, fontWeight: 900 }}>{box.roomCode}</div>
          <div style={{ fontSize: layout.shortCodeFontPx, fontWeight: 700, marginTop: "6px" }}>{box.shortCode}</div>
          {layout.optionalLines.slice(0, 4).map((line, idx) => (
            <div key={`${box.id}-${idx}`} style={{ fontSize: 12, marginTop: "4px" }}>
              {line}
            </div>
          ))}
        </div>
        <img src={qrData} alt="qr" style={{ width: mmToPx(layout.qrSizeMm, dpi), height: mmToPx(layout.qrSizeMm, dpi) }} />
      </div>
    ),
    { width, height }
  );

  return Buffer.from(await image.arrayBuffer());
}

export const pdf_provider = {
  async exportPDF({ boxes, template, labelSize, baseUrl }: ExportCtx) {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.HelveticaBold);
    const regularFont = await pdf.embedFont(StandardFonts.Helvetica);

    if (labelSize.isAvery5160Sheet) {
      const page = pdf.addPage([612, 792]);
      const colCount = 3;
      const rowCount = 10;
      const labelWidth = 2.625 * 72;
      const labelHeight = 1 * 72;
      const leftMargin = 0.1875 * 72;
      const topMargin = 0.5 * 72;
      boxes.slice(0, 30).forEach((box, index) => {
        const row = Math.floor(index / colCount);
        const col = index % colCount;
        if (row >= rowCount) return;
        const x = leftMargin + col * labelWidth;
        const y = 792 - topMargin - (row + 1) * labelHeight;
        page.drawRectangle({ x, y, width: labelWidth, height: labelHeight, borderColor: rgb(0.7, 0.7, 0.7), borderWidth: 0.5 });
        page.drawText(box.roomCode, { x: x + 6, y: y + 36, size: 16, font });
        page.drawText(box.shortCode, { x: x + 6, y: y + 18, size: 10, font: regularFont });
      });
    } else {
      for (const box of boxes) {
        const { widthMm, heightMm } = effectiveSize(labelSize as any);
        const page = pdf.addPage([mmToPt(widthMm), mmToPt(heightMm)]);
        const qrUrl = `${baseUrl}/box/${box.shortCode}`;
        const layout = computeLabelLayout(labelSize as any, { ...box, qrUrl }, template);
        const qrData = await makeQrDataUrl(qrUrl);
        const qr = await pdf.embedPng(qrData);
        const qrPt = mmToPt(layout.qrSizeMm);

        page.drawRectangle({ x: 1, y: 1, width: mmToPt(widthMm) - 2, height: mmToPt(heightMm) - 2, borderWidth: 1, borderColor: rgb(0, 0, 0) });
        page.drawText(box.roomCode, { x: 8, y: mmToPt(heightMm) - 24, size: Math.min(layout.roomCodeFontPx * 0.6, 36), font });
        page.drawText(box.shortCode, { x: 8, y: mmToPt(heightMm) - 42, size: Math.max(layout.shortCodeFontPx * 0.6, 10), font: regularFont });
        layout.optionalLines.slice(0, 4).forEach((line, i) => {
          page.drawText(line, { x: 8, y: mmToPt(heightMm) - 56 - i * 11, size: 9, font: regularFont });
        });
        page.drawImage(qr, { x: mmToPt(widthMm) - qrPt - 6, y: 6, width: qrPt, height: qrPt });
      }
    }

    return Buffer.from(await pdf.save());
  }
};

export const png_provider = {
  async exportPNG({ boxes, template, labelSize, baseUrl, dpi = 300 }: ExportCtx) {
    if (boxes.length === 1) {
      return renderSinglePng(boxes[0], template, labelSize, baseUrl, dpi);
    }

    const zip = new JSZip();
    for (const box of boxes) {
      const png = await renderSinglePng(box, template, labelSize, baseUrl, dpi);
      zip.file(`${box.shortCode}.png`, png);
    }
    return zip.generateAsync({ type: "nodebuffer" });
  }
};

export const csv_provider = {
  exportCSV({ boxes, baseUrl }: Omit<ExportCtx, "template" | "labelSize" | "dpi">) {
    const header = ["room_code", "short_code", "room", "zone", "qr_url", "fragile", "priority", "status", "notes"];
    const rows = boxes.map((box: any) => [
      box.roomCode,
      box.shortCode,
      box.room || "",
      box.zone || "",
      `${baseUrl}/box/${box.shortCode}`,
      String(box.fragile),
      box.priority || "",
      box.status || "",
      (box.notes || "").replace(/\n/g, " ")
    ]);
    return [header, ...rows].map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
  }
};

export const supvan_provider = {
  async exportPDF(ctx: ExportCtx) {
    return pdf_provider.exportPDF(ctx);
  },
  async exportPNG(ctx: ExportCtx) {
    return png_provider.exportPNG(ctx);
  },
  exportCSV(ctx: any) {
    return csv_provider.exportCSV(ctx);
  },
  guidance() {
    return "Use Supvan app: import generated PDF/PNG, verify dimensions and print from mobile print queue.";
  }
};

export const flashlabel_provider = {
  async exportPDF(ctx: ExportCtx) {
    return pdf_provider.exportPDF(ctx);
  },
  async exportPNG(ctx: ExportCtx) {
    return png_provider.exportPNG(ctx);
  },
  exportCSV(ctx: any) {
    return csv_provider.exportCSV(ctx);
  },
  guidance() {
    return "Use FlashLabel app import workflow for PDF/PNG; CSV can be used for tabular import.";
  }
};
