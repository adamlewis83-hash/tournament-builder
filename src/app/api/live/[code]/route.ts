import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { applyPatch, LivePatch } from "@/lib/live";
import { Tournament } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/live/:code -> { data, version }
export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const row = await prisma.liveTournament.findUnique({ where: { code: code.toUpperCase() } });
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ data: row.data, version: row.version });
}

// POST /api/live/:code  (LivePatch) -> { data, version }
export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const upper = code.toUpperCase();
  let patch: LivePatch;
  try {
    patch = (await req.json()) as LivePatch;
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const row = await prisma.liveTournament.findUnique({ where: { code: upper } });
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });

  const nextData = applyPatch(row.data as unknown as Tournament, patch);
  const updated = await prisma.liveTournament.update({
    where: { code: upper },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { data: nextData as any, version: { increment: 1 } },
  });
  return NextResponse.json({ data: updated.data, version: updated.version });
}
