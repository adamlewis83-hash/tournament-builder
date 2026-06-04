import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/library?owner=KEY -> { tournaments: [...] }
export async function GET(req: Request) {
  const owner = new URL(req.url).searchParams.get("owner");
  if (!owner) return NextResponse.json({ tournaments: [] });
  const rows = await prisma.ownedTournament.findMany({
    where: { ownerId: owner },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ tournaments: rows.map((r) => r.data) });
}

// PUT /api/library  { owner, tournament } -> upsert one
export async function PUT(req: Request) {
  try {
    const { owner, tournament } = await req.json();
    if (!owner || !tournament?.id)
      return NextResponse.json({ error: "missing owner/tournament" }, { status: 400 });
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
