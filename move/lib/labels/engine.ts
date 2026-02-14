import QRCode from "qrcode";
import { LabelRenderData, LabelSizeInput, LabelTemplateKey, RenderedLabelLayout } from "@/lib/labels/types";

export const TEMPLATE_LABELS: Record<LabelTemplateKey, string> = {
  standard_inventory: "Standard inventory",
  destination_only: "Destination-only",
  fragile: "FRAGILE",
  open_first: "OPEN FIRST",
  storage: "Storage"
};

const MIN_QR_MM = 18;
const MIN_SHORT_CODE_PX = 12;

export function effectiveSize(size: LabelSizeInput) {
  const landscape = size.orientation === "landscape";
  return {
    widthMm: landscape ? Math.max(size.widthMm, size.heightMm) : Math.min(size.widthMm, size.heightMm),
    heightMm: landscape ? Math.min(size.widthMm, size.heightMm) : Math.max(size.widthMm, size.heightMm)
  };
}

export function buildOptionalLines(data: LabelRenderData): string[] {
  const lines: string[] = [];
  if (data.room) lines.push(data.room);
  if (data.priority || data.fragile) lines.push(`${data.priority || ""}${data.fragile ? " • FRAGILE" : ""}`.trim());
  if (data.zone) lines.push(`Zone: ${data.zone}`);
  if (data.notes) lines.push(data.notes);
  return lines;
}

export function computeLabelLayout(size: LabelSizeInput, data: LabelRenderData, template: LabelTemplateKey): RenderedLabelLayout {
  const warnings: string[] = [];
  const { widthMm, heightMm } = effectiveSize(size);
  const contentWidth = widthMm - size.marginLeftMm - size.marginRightMm - size.safePaddingMm * 2;
  const contentHeight = heightMm - size.marginTopMm - size.marginBottomMm - size.safePaddingMm * 2;

  let optionalLines = buildOptionalLines(data);
  if (template === "destination_only") optionalLines = optionalLines.filter((x) => !x.startsWith("Zone") && !x.includes("FRAGILE"));
  if (template === "fragile") optionalLines = ["FRAGILE", ...optionalLines];
  if (template === "open_first") optionalLines = ["OPEN FIRST", ...optionalLines];
  if (template === "storage") optionalLines = ["STORAGE", ...optionalLines];

  let qrSizeMm = Math.max(MIN_QR_MM, Math.min(contentWidth * 0.35, contentHeight * 0.6));
  const roomCodeFontPx = Math.max(20, Math.floor((contentWidth / Math.max(data.roomCode.length, 2)) * 4.2));
  let shortCodeFontPx = Math.max(MIN_SHORT_CODE_PX, Math.floor(roomCodeFontPx * 0.32));

  const maxLines = Math.max(0, Math.floor((contentHeight - qrSizeMm - 8) / Math.max(12, shortCodeFontPx)));
  if (optionalLines.length > maxLines) {
    optionalLines = optionalLines.slice(Math.max(0, optionalLines.length - maxLines));
    warnings.push("Optional lines were collapsed due to tight label size.");
  }

  if (contentWidth < 25 || contentHeight < 20) {
    warnings.push("Label is extremely small and readability may be affected.");
  }

  if (qrSizeMm < MIN_QR_MM) {
    qrSizeMm = MIN_QR_MM;
    warnings.push("QR size was increased to maintain scan reliability.");
  }

  if (shortCodeFontPx <= MIN_SHORT_CODE_PX) {
    warnings.push("Short code reached minimum font size.");
  }

  return { roomCodeFontPx, shortCodeFontPx, optionalLines, qrSizeMm, warnings };
}

export async function makeQrDataUrl(value: string) {
  return QRCode.toDataURL(value, {
    margin: 0,
    errorCorrectionLevel: "M"
  });
}

export function mmToPx(mm: number, dpi = 300) {
  return Math.floor((mm / 25.4) * dpi);
}
