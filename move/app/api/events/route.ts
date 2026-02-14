import { NextResponse } from "next/server";
import { requireUserForApi } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

/**
 * POST /api/events
 * Lightweight funnel instrumentation. Writes to ActivityLog (already in schema).
 * Body: { action: string; boxId?: string; details?: Record<string, unknown> }
 * Fire-and-forget from the client — 204 on success, fail silently on errors.
 */
export async function POST(req: Request) {
  try {
    await requireUserForApi();
    const { action, boxId, details } = await req.json();
    if (!action || typeof action !== "string") {
      return new NextResponse(null, { status: 204 });
    }
    await prisma.activityLog.create({
      data: { action, boxId: boxId ?? null, details: details ?? {} }
    });
  } catch {
    // Intentionally silent — analytics must never break the UI
  }
  return new NextResponse(null, { status: 204 });
}
