import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/library?owner=KEY -> { tournaments: [...], deletedIds: [...] }
// deletedIds are tombstones: ids this owner deleted. Clients prune them locally,
// so a device that was closed during the delete stops resurrecting them.
export async function GET(req: Request) {
  const owner = new URL(req.url).searchParams.get("owner");
  if (!owner) return NextResponse.json({ tournaments: [], deletedIds: [] });
  const rows = await prisma.ownedTournament.findMany({
    where: { ownerId: owner },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({
    tournaments: rows.filter((r) => !r.deletedAt).map((r) => r.data),
    deletedIds: rows.filter((r) => r.deletedAt).map((r) => r.id),
  });
}

// PUT /api/library  { owner, tournament } -> upsert one.
// A tombstoned id is never resurrected — a stale device re-pushing its old copy
// on load is exactly what tombstones exist to stop. (A re-created tournament
// gets a fresh id, so this can't block a genuine new one.)
export async function PUT(req: Request) {
  try {
    const { owner, tournament } = await req.json();
    if (!owner || !tournament?.id)
      return NextResponse.json({ error: "missing owner/tournament" }, { status: 400 });
    const existing = await prisma.ownedTournament.findUnique({ where: { id: tournament.id } });
    if (existing?.deletedAt) return NextResponse.json({ ok: true, ignored: "deleted" });
    await prisma.ownedTournament.upsert({
      where: { id: tournament.id },
      create: { id: tournament.id, ownerId: owner, data: tournament },
      update: { ownerId: owner, data: tournament },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
}
