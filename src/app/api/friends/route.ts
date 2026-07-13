import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/friends?owner=KEY -> { friends: [...] }
export async function GET(req: Request) {
  const owner = new URL(req.url).searchParams.get("owner");
  if (!owner) return NextResponse.json({ friends: [] });
  const row = await prisma.ownedFriends.findUnique({ where: { ownerId: owner } });
  return NextResponse.json({ friends: (row?.data as unknown[]) ?? [] });
}

// PUT /api/friends  { owner, friends } -> replace the whole list for this owner
export async function PUT(req: Request) {
  try {
    const { owner, friends } = await req.json();
    if (!owner || !Array.isArray(friends))
      return NextResponse.json({ error: "missing owner/friends" }, { status: 400 });
    await prisma.ownedFriends.upsert({
      where: { ownerId: owner },
      create: { ownerId: owner, data: friends },
      update: { data: friends },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
}
