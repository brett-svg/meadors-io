import { Orientation } from "@prisma/client";

export type LabelTemplateKey =
  | "standard_inventory"
  | "destination_only"
  | "fragile"
  | "open_first"
  | "storage";

export type LabelSizeInput = {
  id?: string;
  name: string;
  widthMm: number;
  heightMm: number;
  orientation: Orientation;
  marginTopMm: number;
  marginRightMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
  safePaddingMm: number;
  cornerRadiusMm?: number | null;
  isAvery5160Sheet?: boolean;
};

export type LabelRenderData = {
  roomCode: string;
  shortCode: string;
  room?: string | null;
  zone?: string | null;
  priority?: string | null;
  fragile?: boolean;
  notes?: string | null;
  qrUrl: string;
};

export type RenderedLabelLayout = {
  roomCodeFontPx: number;
  shortCodeFontPx: number;
  optionalLines: string[];
  qrSizeMm: number;
  warnings: string[];
};
