import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// DELETE /api/library/:id?owner=KEY
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const owner = new URL(req.url).searchParams.get("owner");
  if (!owner) return NextResponse.json({ error: "missing owner" }, { status: 400 });
  await prisma.ownedTournament.deleteMany({ where: { id, ownerId: owner } });
  return NextResponse.json({ ok: true });
}
