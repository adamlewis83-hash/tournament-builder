import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const pair = (x: string, y: string): [string, string] => (x < y ? [x, y] : [y, x]);

// GET /api/feed/link?code=X -> { name } — who does this invite belong to?
// Powers the /f/[code] landing page ("Adam wants to link on Sporos").
export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get("code");
  if (!code) return NextResponse.json({ error: "missing code" }, { status: 400 });
  const row = await prisma.friendCode.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ name: row.name });
}

// POST /api/feed/link  { owner, code, name? } -> { ok, friend: { name } }
// Entering someone's friend code links the two accounts mutually — possession
// of the code is the consent, same as a tournament join code. The caller's
// own FriendCode row is created/refreshed too (with their profile name), so
// the other side's feed can name them.
export async function POST(req: Request) {
  try {
    const { owner, code, name } = (await req.json()) as {
      owner?: string;
      code?: string;
      name?: string;
    };
    if (!owner || !code) return NextResponse.json({ error: "missing owner/code" }, { status: 400 });
    const target = await prisma.friendCode.findUnique({
      where: { code: code.trim().toUpperCase() },
    });
    if (!target) return NextResponse.json({ error: "code not found" }, { status: 404 });
    if (target.ownerId === owner)
      return NextResponse.json({ error: "that's your own code" }, { status: 400 });

    const [a, b] = pair(owner, target.ownerId);
    await prisma.friendPair.upsert({
      where: { a_b: { a, b } },
      create: { a, b },
      update: {},
    });
    // Make sure the caller is nameable in the other direction.
    const myName = (name ?? "").trim().slice(0, 60);
    if (myName) {
      const mine = await prisma.friendCode.findUnique({ where: { ownerId: owner } });
      if (mine) {
        if (mine.name !== myName)
          await prisma.friendCode.update({ where: { ownerId: owner }, data: { name: myName } });
      } else {
        // Reuse the code route's alphabet indirectly: a simple random here is
        // fine — the caller can regenerate a prettier one from Settings later.
        const ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789";
        const bytes = new Uint8Array(8);
        crypto.getRandomValues(bytes);
        const fresh = Array.from(bytes, (v) => ALPHABET[v % ALPHABET.length]).join("");
        await prisma.friendCode
          .create({ data: { ownerId: owner, code: fresh, name: myName } })
          .catch(() => {});
      }
    }
    return NextResponse.json({ ok: true, friend: { name: target.name } });
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
}

// DELETE /api/feed/link  { owner, friendKey } -> { ok } — unlink both ways.
export async function DELETE(req: Request) {
  try {
    const { owner, friendKey } = (await req.json()) as { owner?: string; friendKey?: string };
    if (!owner || !friendKey)
      return NextResponse.json({ error: "missing owner/friendKey" }, { status: 400 });
    const [a, b] = pair(owner, friendKey);
    await prisma.friendPair.deleteMany({ where: { a, b } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
}
