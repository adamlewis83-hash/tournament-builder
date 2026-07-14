import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// DELETE /api/library/:id?owner=KEY
// Soft-delete: leave a tombstone instead of dropping the row, so every other
// device learns the tournament is gone. Hard-deleting let a device that was
// closed during the delete re-push its stale copy on next load and resurrect it.
// Upsert (not update) so an id that was never synced still gets a tombstone.
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const owner = new URL(req.url).searchParams.get("owner");
  if (!owner) return NextResponse.json({ error: "missing owner" }, { status: 400 });
  const existing = await prisma.ownedTournament.findUnique({ where: { id } });
  // Only the owner may tombstone their own row.
  if (existing && existing.ownerId !== owner)
    return NextResponse.json({ error: "not owner" }, { status: 403 });
  await prisma.ownedTournament.upsert({
    where: { id },
    create: { id, ownerId: owner, data: {}, deletedAt: new Date() },
    update: { deletedAt: new Date(), data: {} },
  });
  return NextResponse.json({ ok: true });
}
