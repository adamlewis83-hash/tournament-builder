import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/feed/links?owner=KEY -> { friends: [{ key, name, sharing, lastActive }] }
// Who this account is actually linked to. The feed only ever showed a friend
// once they had activity to show, so a link made against the wrong browser (an
// invite opened outside the app) was invisible and impossible to undo. This
// lists the links themselves, activity or not.
export async function GET(req: Request) {
  const owner = new URL(req.url).searchParams.get("owner");
  if (!owner) return NextResponse.json({ friends: [] });

  const pairs = await prisma.friendPair.findMany({ where: { OR: [{ a: owner }, { b: owner }] } });
  const keys = pairs.map((p) => (p.a === owner ? p.b : p.a));
  if (!keys.length) return NextResponse.json({ friends: [] });

  const [names, prefs, active] = await Promise.all([
    prisma.friendCode.findMany({ where: { ownerId: { in: keys } } }),
    prisma.feedPrefs.findMany({ where: { ownerId: { in: keys } } }),
    prisma.ownedTournament.groupBy({
      by: ["ownerId"],
      where: { ownerId: { in: keys }, deletedAt: null },
      _max: { updatedAt: true },
    }),
  ]);
  const nameOf = new Map(names.map((n) => [n.ownerId, n.name]));
  const hidden = new Set(prefs.filter((p) => !p.shareActivity).map((p) => p.ownerId));
  const lastOf = new Map(active.map((a) => [a.ownerId, a._max.updatedAt?.getTime() ?? null]));

  return NextResponse.json({
    friends: keys.map((key) => ({
      key,
      name: nameOf.get(key) ?? null,
      sharing: !hidden.has(key),
      lastActive: lastOf.get(key) ?? null,
    })),
  });
}
