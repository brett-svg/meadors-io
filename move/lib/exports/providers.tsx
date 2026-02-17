import { Box, LabelSize } from "@prisma/client";
import JSZip from "jszip";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { computeLabelLayout, effectiveSize, makeQrDataUrl, mmToPx } from "@/lib/labels/engine";
import { LabelTemplateKey } from "@/lib/labels/types";

function mmToPt(mm: number) {
  return (mm * 72) / 25.4;
}

/** Font size (pt) that fits all items in the available height */
function inventoryFontPt(itemCount: number, availableHeightPt: number): number {
  if (itemCount === 0) return 9;
  const lineHeight = availableHeightPt / itemCount;
  const fontSize = lineHeight / 1.45;
  return Math.min(10, Math.max(4, fontSize));
}

/** Font size (px) that fits all items in the available height */
function inventoryFontPx(itemCount: number, availableHeightPx: number): number {
  if (itemCount === 0) return 28;
  const lineHeight = availableHeightPx / itemCount;
  const fontSize = lineHeight / 1.45;
  return Math.min(36, Math.max(14, fontSize));
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
  const isInventory = template === "inventory_4x6";
  const qrPx = isInventory ? 0 : mmToPx(layout.qrSizeMm, dpi);
  const items = box.items ?? [];
  const itemCount = items.length;

  // ── Inventory 4×6 PNG layout ──────────────────────────────────────────────
  // Header zone: ~42% of height. Items zone: rest.
  const pad = Math.round(width * 0.03);           // ~3% padding
  const headerH = Math.round(height * 0.42);
  const qrSize = headerH - pad * 2;               // QR fills header height minus padding
  const leftW = width - qrSize - pad * 3;         // text column width

  // Item font: fit ALL items in the available zone
  const headerLabelH = Math.round(height * 0.04);
  const itemZoneH = height - headerH - headerLabelH - pad * 3;
  const chosenFontPx = Math.round(inventoryFontPx(itemCount, itemZoneH));
  const lineH = Math.round(chosenFontPx * 1.45);
  const visibleItems = items;
  const hiddenCount = 0;

  // Room code font: big, but never so big it crowds the header
  const roomFontPx = Math.min(Math.round(headerH * 0.52), Math.round(leftW * 0.55));
  const shortFontPx = Math.round(roomFontPx * 0.30);
  const roomNameFontPx = Math.round(roomFontPx * 0.22);

  const inventoryJsx = (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#ffffff",
          fontFamily: "'Arial Black', Arial, sans-serif",
          boxSizing: "border-box",
          overflow: "hidden"
        }}
      >
        {/* ── HEADER BAND ─────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "stretch",
            width: "100%",
            height: headerH,
            background: "#0f172a",
            padding: `${pad}px`,
            boxSizing: "border-box",
            gap: `${pad}px`,
            flexShrink: 0
          }}
        >
          {/* Left: room code + short code + room name */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              flex: 1,
              overflow: "hidden"
            }}
          >
            <div
              style={{
                fontSize: roomFontPx,
                fontWeight: 900,
                color: "#ffffff",
                lineHeight: 1,
                letterSpacing: "-1px"
              }}
            >
              {box.roomCode}
            </div>
            <div
              style={{
                fontSize: shortFontPx,
                fontWeight: 700,
                color: "#94a3b8",
                marginTop: Math.round(pad * 0.4),
                letterSpacing: "0.5px"
              }}
            >
              {box.shortCode}
            </div>
            {box.room && (
              <div
                style={{
                  fontSize: roomNameFontPx,
                  color: "#64748b",
                  marginTop: Math.round(pad * 0.3),
                  fontFamily: "Arial, sans-serif",
                  fontWeight: 400
                }}
              >
                {box.room}{box.zone ? ` · ${box.zone}` : ""}
              </div>
            )}
            {box.fragile && (
              <div
                style={{
                  fontSize: roomNameFontPx,
                  color: "#fbbf24",
                  fontWeight: 700,
                  marginTop: Math.round(pad * 0.3),
                  fontFamily: "Arial, sans-serif"
                }}
              >
                FRAGILE
              </div>
            )}
          </div>

          {/* Right: QR code on white tile */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#ffffff",
              borderRadius: Math.round(pad * 0.6),
              width: qrSize,
              height: qrSize,
              flexShrink: 0,
              padding: Math.round(pad * 0.3)
            }}
          >
            <img src={qrData} alt="qr" style={{ width: "100%", height: "100%" }} />
          </div>
        </div>

        {/* ── CONTENTS ZONE ───────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            padding: `${Math.round(pad * 0.8)}px ${pad}px`,
            boxSizing: "border-box",
            overflow: "hidden"
          }}
        >
          {/* Section label */}
          <div
            style={{
              fontSize: Math.round(headerLabelH * 0.75),
              fontWeight: 700,
              color: "#64748b",
              fontFamily: "Arial, sans-serif",
              letterSpacing: "1px",
              marginBottom: Math.round(pad * 0.4),
              textTransform: "uppercase"
            }}
          >
            Contents{itemCount > 0 ? ` · ${itemCount}` : ""}
          </div>

          {/* Item rows */}
          {visibleItems.map((item, idx) => (
            <div
              key={`${box.id}-item-${idx}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: Math.round(chosenFontPx * 0.4),
                height: lineH,
                overflow: "hidden"
              }}
            >
              <div
                style={{
                  width: Math.round(chosenFontPx * 0.18),
                  height: Math.round(chosenFontPx * 0.18),
                  background: "#0f172a",
                  borderRadius: "50%",
                  flexShrink: 0,
                  marginTop: 2
                }}
              />
              <div
                style={{
                  fontSize: chosenFontPx,
                  color: "#0f172a",
                  fontFamily: "Arial, sans-serif",
                  fontWeight: 400,
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                  overflow: "hidden"
                }}
              >
                {item.name}{item.qty > 1 ? (
                  <span style={{ color: "#64748b", fontSize: Math.round(chosenFontPx * 0.8) }}> ×{item.qty}</span>
                ) : null}
              </div>
            </div>
          ))}

          {hiddenCount > 0 && (
            <div
              style={{
                fontSize: Math.round(chosenFontPx * 0.8),
                color: "#94a3b8",
                fontFamily: "Arial, sans-serif",
                marginTop: Math.round(pad * 0.3)
              }}
            >
              + {hiddenCount} more
            </div>
          )}

          {itemCount === 0 && (
            <div style={{ fontSize: chosenFontPx, color: "#94a3b8", fontFamily: "Arial, sans-serif" }}>
              No items listed
            </div>
          )}
        </div>
      </div>
  );

  const standardJsx = (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "row",
          border: "2px solid #0f172a",
          boxSizing: "border-box",
          padding: "14px",
          fontFamily: "Arial",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "8px",
          background: "#ffffff"
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ fontSize: layout.roomCodeFontPx, fontWeight: 900, lineHeight: 1.05 }}>{box.roomCode}</div>
          <div style={{ fontSize: Math.max(10, layout.shortCodeFontPx), fontWeight: 700, color: "#374151", marginTop: "4px" }}>{box.shortCode}</div>
          {layout.optionalLines.slice(0, 3).map((line, idx) => (
            <div key={`${box.id}-opt-${idx}`} style={{ fontSize: 12, marginTop: "3px", color: "#6b7280" }}>{line}</div>
          ))}
        </div>
        <img src={qrData} alt="qr" style={{ width: qrPx, height: qrPx, flexShrink: 0 }} />
      </div>
  );

  const image = new ImageResponse(isInventory ? inventoryJsx : standardJsx, { width, height });
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
          // ── Inventory 4×6 layout — dark header band ───────────────────────
          const pad = 10;                            // pt inset from edges
          const headerH = Math.round(pagePtH * 0.42); // ~42% for header band
          const headerY = pagePtH - headerH;         // bottom of header band (pdf-lib Y=0 is bottom)

          // Dark navy header band
          page.drawRectangle({
            x: 0, y: headerY,
            width: pagePtW, height: headerH,
            color: rgb(0.059, 0.090, 0.165)          // #0f172a
          });

          // QR on white tile — right side of header
          const qrInset = headerH - pad * 2;
          const qrTileX = pagePtW - qrInset - pad;
          const qrTileY = headerY + pad;
          page.drawRectangle({ x: qrTileX - 4, y: qrTileY - 4, width: qrInset + 8, height: qrInset + 8, color: rgb(1, 1, 1) });
          page.drawImage(qr, { x: qrTileX, y: qrTileY, width: qrInset, height: qrInset });

          // Room code — large white text
          const roomFontSize = Math.min(Math.round(headerH * 0.42), 36);
          const shortFontSize = Math.round(roomFontSize * 0.28);
          const roomNameFontSize = Math.round(roomFontSize * 0.20);

          const textX = pad + 2;
          const roomCodeY = headerY + headerH - pad - roomFontSize;
          page.drawText(box.roomCode, { x: textX, y: roomCodeY, size: roomFontSize, font, color: rgb(1, 1, 1) });
          page.drawText(box.shortCode, { x: textX, y: roomCodeY - shortFontSize - 4, size: shortFontSize, font, color: rgb(0.58, 0.64, 0.73) });

          const roomLabel = [box.room, box.zone].filter(Boolean).join(" · ");
          if (roomLabel) {
            page.drawText(roomLabel.slice(0, 30), {
              x: textX, y: roomCodeY - shortFontSize - 4 - roomNameFontSize - 3,
              size: roomNameFontSize, font: regularFont, color: rgb(0.39, 0.46, 0.55)
            });
          }
          if (box.fragile) {
            page.drawText("FRAGILE", {
              x: textX, y: headerY + pad,
              size: roomNameFontSize, font, color: rgb(0.98, 0.75, 0.14)   // amber
            });
          }

          // Contents zone — fit ALL items by adjusting font size
          const itemCount = items.length;
          const contentsY = headerY - pad;
          const labelFontSize = 7;
          const itemStartY = contentsY - labelFontSize - 4;
          const availHeight = itemStartY - pad;
          const fontSize = inventoryFontPt(itemCount, availHeight);
          const lineH = fontSize * 1.45;

          // "CONTENTS · N" label
          page.drawText(
            `CONTENTS${itemCount > 0 ? `  \u00B7  ${itemCount}` : ""}`,
            { x: pad, y: contentsY - labelFontSize, size: labelFontSize, font, color: rgb(0.39, 0.46, 0.55) }
          );

          items.forEach((item, i) => {
            const itemText = `  ${item.name}${item.qty > 1 ? `  x${item.qty}` : ""}`;
            page.drawText(itemText, {
              x: pad, y: itemStartY - i * lineH,
              size: fontSize, font: regularFont, color: rgb(0.06, 0.09, 0.15)
            });
            page.drawCircle({ x: pad + 3, y: itemStartY - i * lineH + fontSize * 0.35, size: Math.max(1, fontSize * 0.12), color: rgb(0.06, 0.09, 0.15) });
          });
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
