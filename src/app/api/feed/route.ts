import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Tournament } from "@/lib/types";
import { getResult } from "@/lib/result";
import { computeGolf } from "@/lib/golf";
import type { FeedItem } from "@/lib/feed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

// GET /api/feed?owner=KEY -> { items: FeedItem[] }
// Recent activity from the accounts this one is linked to, newest first.
// Friends who opted out in Settings simply don't appear — no trace either way.
export async function GET(req: Request) {
  const owner = new URL(req.url).searchParams.get("owner");
  if (!owner) return NextResponse.json({ items: [] });

  const pairs = await prisma.friendPair.findMany({
    where: { OR: [{ a: owner }, { b: owner }] },
  });
  const friendKeys = pairs.map((p) => (p.a === owner ? p.b : p.a));
  if (!friendKeys.length) return NextResponse.json({ items: [] });

  const [prefs, names, rows] = await Promise.all([
    prisma.feedPrefs.findMany({ where: { ownerId: { in: friendKeys } } }),
    prisma.friendCode.findMany({ where: { ownerId: { in: friendKeys } } }),
    prisma.ownedTournament.findMany({
      where: {
        ownerId: { in: friendKeys },
        deletedAt: null,
        updatedAt: { gt: new Date(Date.now() - WINDOW_MS) },
      },
      orderBy: { updatedAt: "desc" },
      take: 40,
    }),
  ]);
  const hidden = new Set(prefs.filter((p) => !p.shareActivity).map((p) => p.ownerId));
  const nameOf = new Map(names.map((n) => [n.ownerId, n.name]));

  const items: FeedItem[] = [];
  for (const row of rows) {
    if (hidden.has(row.ownerId)) continue;
    const t = row.data as unknown as Tournament;
    if (!t?.generated) continue; // setup noise isn't activity
    const complete = getResult(t).complete;
    const hasScores =
      t.matches?.some((m) => m.scoreA != null || m.scoreB != null) ||
      (t.golf && Object.values(t.golf.scores ?? {}).some((c) => c?.some((s) => s != null)));
    const status: FeedItem["status"] = complete ? "final" : t.liveCode ? "live" : "in-play";
    if (status === "in-play" && !hasScores) continue;

    const item: FeedItem = {
      friendKey: row.ownerId,
      friendName: nameOf.get(row.ownerId) ?? "A friend",
      tournamentName: t.name,
      sport: t.sport,
      updatedAt: t.updatedAt,
      status,
    };
    if (status === "live" && t.liveCode) item.liveCode = t.liveCode;
    // Golf gets the Grint moment: how the friend themselves is scoring.
    if (t.format === "golf" && t.golf) {
      const me = computeGolf(t, "stroke").find(
        (r) => r.name.trim().toLowerCase() === (item.friendName ?? "").trim().toLowerCase(),
      );
      if (me && me.thru > 0) item.golf = { thru: me.thru, toPar: me.toPar };
    }
    items.push(item);
    if (items.length >= 12) break;
  }
  return NextResponse.json({ items });
}
