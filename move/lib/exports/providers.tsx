import { Box, LabelSize } from "@prisma/client";
import JSZip from "jszip";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { computeLabelLayout, effectiveSize, makeQrDataUrl, mmToPx } from "@/lib/labels/engine";
import { LabelTemplateKey } from "@/lib/labels/types";

function mmToPt(mm: number) {
  return (mm * 72) / 25.4;
}

/** Adaptive font size for inventory lists based on item count */
function inventoryFontPt(itemCount: number): number {
  if (itemCount <= 8)  return 9;
  if (itemCount <= 14) return 8;
  if (itemCount <= 20) return 7;
  return 6;
}

/** Adaptive font size for PNG inventory (px at given DPI) */
function inventoryFontPx(itemCount: number, dpi: number): number {
  const pt = inventoryFontPt(itemCount);
  return Math.round((pt / 72) * dpi);
}

/** Max items that fit at a given font size given available height in pt */
function maxItemsFit(availableHeightPt: number, fontPt: number): number {
  const lineHeight = fontPt * 1.4;
  return Math.max(0, Math.floor(availableHeightPt / lineHeight));
}

type BoxForLabel = Pick<
  Box,
  "id" | "shortCode" | "roomCode" | "room" | "zone" | "priority" | "fragile" | "notes"
> & {
  items?: Array<{ name: string; qty: number }>;
};

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
  const qrPx = mmToPx(layout.qrSizeMm, dpi);

  const isInventory = template === "inventory_4x6";
  const items = box.items ?? [];
  const itemCount = items.length;
  const itemFontPx = inventoryFontPx(itemCount, dpi);
  // How many items fit in the space below the header
  const headerHeightPx = mmToPx(35, dpi); // rough header + short code height
  const availPx = height - headerHeightPx - 20;
  const maxItems = Math.max(0, Math.floor(availPx / (itemFontPx * 1.4)));
  const visibleItems = items.slice(0, maxItems);
  const hiddenCount = itemCount - visibleItems.length;

  const image = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: isInventory ? "column" : "row",
          border: "2px solid #0f172a",
          boxSizing: "border-box",
          padding: "14px",
          fontFamily: "Arial",
          justifyContent: isInventory ? "flex-start" : "space-between",
          gap: isInventory ? "0" : "8px"
        }}
      >
        {/* Header row: room code + QR */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            width: "100%",
            flexShrink: 0
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: isInventory ? Math.min(layout.roomCodeFontPx, 52) : layout.roomCodeFontPx, fontWeight: 900, lineHeight: 1.05 }}>
              {box.roomCode}
            </div>
            <div style={{ fontSize: Math.max(10, layout.shortCodeFontPx), fontWeight: 700, color: "#374151", marginTop: "4px" }}>
              {box.shortCode}
            </div>
            {!isInventory && layout.optionalLines.slice(0, 3).map((line, idx) => (
              <div key={`${box.id}-opt-${idx}`} style={{ fontSize: 12, marginTop: "3px", color: "#6b7280" }}>
                {line}
              </div>
            ))}
            {isInventory && box.room && (
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: "3px" }}>{box.room}{box.zone ? ` · ${box.zone}` : ""}</div>
            )}
            {isInventory && box.fragile && (
              <div style={{ fontSize: 11, color: "#b45309", fontWeight: 700, marginTop: "2px" }}>⚠ FRAGILE</div>
            )}
          </div>
          <img src={qrData} alt="qr" style={{ width: qrPx, height: qrPx, flexShrink: 0 }} />
        </div>

        {/* Inventory section */}
        {isInventory && itemCount > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              borderTop: "1.5px solid #e2e8f0",
              marginTop: "6px",
              paddingTop: "5px",
              width: "100%",
              flexShrink: 0
            }}
          >
            <div style={{ fontSize: Math.max(9, itemFontPx * 0.85), fontWeight: 700, color: "#374151", marginBottom: "3px" }}>
              CONTENTS ({itemCount} item{itemCount !== 1 ? "s" : ""})
            </div>
            {visibleItems.map((item, idx) => (
              <div key={`${box.id}-item-${idx}`} style={{ display: "flex", alignItems: "baseline", gap: "5px", fontSize: itemFontPx, color: "#111827", lineHeight: 1.35 }}>
                <span style={{ color: "#9ca3af", fontSize: itemFontPx * 0.85 }}>·</span>
                <span>{item.name}{item.qty > 1 ? ` ×${item.qty}` : ""}</span>
              </div>
            ))}
            {hiddenCount > 0 && (
              <div style={{ fontSize: Math.max(8, itemFontPx * 0.9), color: "#9ca3af", marginTop: "2px" }}>
                + {hiddenCount} more item{hiddenCount !== 1 ? "s" : ""}
              </div>
            )}
          </div>
        )}
        {isInventory && itemCount === 0 && (
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: "6px" }}>No items listed</div>
        )}
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
      const labelWidth = 2.625 * 72;   // 189 pt
      const labelHeight = 1 * 72;       // 72 pt
      const leftMargin = 0.1875 * 72;
      const topMargin = 0.5 * 72;
      const qrSize = 52; // pt — fits comfortably in 72pt height with padding

      for (let index = 0; index < Math.min(boxes.length, 30); index++) {
        const box = boxes[index];
        const row = Math.floor(index / colCount);
        const col = index % colCount;
        if (row >= rowCount) continue;
        const x = leftMargin + col * labelWidth;
        const y = 792 - topMargin - (row + 1) * labelHeight;

        page.drawRectangle({ x, y, width: labelWidth, height: labelHeight, borderColor: rgb(0.7, 0.7, 0.7), borderWidth: 0.5 });

        // Text block on the left
        page.drawText(box.roomCode, { x: x + 5, y: y + labelHeight - 22, size: 15, font });
        page.drawText(box.shortCode, { x: x + 5, y: y + labelHeight - 36, size: 8, font: regularFont });
        if (box.room) {
          page.drawText(String(box.room).slice(0, 20), { x: x + 5, y: y + labelHeight - 48, size: 7, font: regularFont, color: rgb(0.3, 0.3, 0.3) });
        }
        if (box.fragile) {
          page.drawText("⚠ FRAGILE", { x: x + 5, y: y + 6, size: 7, font, color: rgb(0.8, 0.4, 0) });
        }

        // QR code on the right
        const qrUrl = `${baseUrl}/box/${box.shortCode}`;
        const qrData = await makeQrDataUrl(qrUrl);
        const qr = await pdf.embedPng(qrData);
        const qrX = x + labelWidth - qrSize - 5;
        const qrY = y + (labelHeight - qrSize) / 2;
        page.drawImage(qr, { x: qrX, y: qrY, width: qrSize, height: qrSize });
      }
    } else {
      for (const box of boxes) {
        const { widthMm, heightMm } = effectiveSize(labelSize as any);
        const pagePtW = mmToPt(widthMm);
        const pagePtH = mmToPt(heightMm);
        const page = pdf.addPage([pagePtW, pagePtH]);
        const qrUrl = `${baseUrl}/box/${box.shortCode}`;
        const layout = computeLabelLayout(labelSize as any, { ...box, qrUrl }, template);
        const qrData = await makeQrDataUrl(qrUrl);
        const qr = await pdf.embedPng(qrData);
        const qrPt = mmToPt(layout.qrSizeMm);

        const isInventory = template === "inventory_4x6";
        const items = box.items ?? [];

        // Border
        page.drawRectangle({ x: 1, y: 1, width: pagePtW - 2, height: pagePtH - 2, borderWidth: 1, borderColor: rgb(0, 0, 0) });

        if (isInventory) {
          // ── Inventory 4×6 layout ──────────────────────────────────────────
          const headerY = pagePtH - 20;
          const roomFontSize = Math.min(Math.max(layout.roomCodeFontPx * 0.55, 18), 32);
          const shortFontSize = Math.max(layout.shortCodeFontPx * 0.55, 9);

          // Room code (top-left)
          page.drawText(box.roomCode, { x: 8, y: headerY, size: roomFontSize, font });
          page.drawText(box.shortCode, { x: 8, y: headerY - roomFontSize - 3, size: shortFontSize, font: regularFont });

          // Room name + zone
          const roomLabel = [box.room, box.zone].filter(Boolean).join(" · ");
          if (roomLabel) {
            page.drawText(roomLabel, { x: 8, y: headerY - roomFontSize - 3 - shortFontSize - 4, size: 8, font: regularFont, color: rgb(0.4, 0.4, 0.4) });
          }

          // Fragile badge
          if (box.fragile) {
            page.drawText("⚠ FRAGILE", { x: 8, y: 8, size: 8, font, color: rgb(0.8, 0.4, 0) });
          }

          // QR code (top-right, vertically centred in header zone)
          const headerZonePt = pagePtH * 0.4; // top 40% is header
          const qrInset = Math.min(qrPt, headerZonePt - 8);
          page.drawImage(qr, { x: pagePtW - qrInset - 8, y: pagePtH - qrInset - 8, width: qrInset, height: qrInset });

          // Divider
          const dividerY = pagePtH - headerZonePt;
          page.drawLine({ start: { x: 4, y: dividerY }, end: { x: pagePtW - 4, y: dividerY }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });

          // Inventory section
          const itemCount = items.length;
          const fontSize = inventoryFontPt(itemCount);
          const lineH = fontSize * 1.4;
          const inventoryTop = dividerY - 4;

          // "CONTENTS (N items)" header
          page.drawText(
            `CONTENTS${itemCount > 0 ? ` (${itemCount} item${itemCount !== 1 ? "s" : ""})` : ""}`,
            { x: 8, y: inventoryTop - fontSize, size: Math.max(7, fontSize - 1), font, color: rgb(0.35, 0.35, 0.35) }
          );

          const itemStartY = inventoryTop - fontSize - lineH;
          const availHeight = itemStartY - (box.fragile ? 18 : 8);
          const maxItems = maxItemsFit(availHeight, fontSize);
          const visibleItems = items.slice(0, maxItems);
          const hiddenCount = itemCount - visibleItems.length;

          visibleItems.forEach((item, i) => {
            const itemText = `· ${item.name}${item.qty > 1 ? ` ×${item.qty}` : ""}`;
            page.drawText(itemText, {
              x: 8,
              y: itemStartY - i * lineH,
              size: fontSize,
              font: regularFont,
              color: rgb(0.1, 0.1, 0.1)
            });
          });

          if (hiddenCount > 0) {
            page.drawText(`+ ${hiddenCount} more item${hiddenCount !== 1 ? "s" : ""}`, {
              x: 8,
              y: itemStartY - visibleItems.length * lineH,
              size: Math.max(6, fontSize - 1),
              font: regularFont,
              color: rgb(0.55, 0.55, 0.55)
            });
          }
        } else {
          // ── Standard layout ───────────────────────────────────────────────
          page.drawText(box.roomCode, { x: 8, y: pagePtH - 24, size: Math.min(layout.roomCodeFontPx * 0.6, 36), font });
          page.drawText(box.shortCode, { x: 8, y: pagePtH - 42, size: Math.max(layout.shortCodeFontPx * 0.6, 10), font: regularFont });
          layout.optionalLines.slice(0, 4).forEach((line, i) => {
            page.drawText(line, { x: 8, y: pagePtH - 56 - i * 11, size: 9, font: regularFont });
          });
          page.drawImage(qr, { x: pagePtW - qrPt - 6, y: 6, width: qrPt, height: qrPt });
        }
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
