import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Human-friendly code alphabet — no 0/O/1/I lookalikes.
const ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789";
function newCode(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

// GET /api/feed/code?owner=KEY&name=Adam -> { code, name }
// Get-or-create the account's shareable friend code; refreshes the display
// name (shown in linked friends' feeds) from the profile on every visit.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const owner = url.searchParams.get("owner");
  const name = (url.searchParams.get("name") ?? "").trim().slice(0, 60);
  if (!owner) return NextResponse.json({ error: "missing owner" }, { status: 400 });
  const existing = await prisma.friendCode.findUnique({ where: { ownerId: owner } });
  if (existing) {
    if (name && name !== existing.name)
      await prisma.friendCode.update({ where: { ownerId: owner }, data: { name } });
    return NextResponse.json({ code: existing.code, name: name || existing.name });
  }
  // Retry on the (astronomically unlikely) code collision.
  for (let i = 0; i < 3; i++) {
    try {
      const row = await prisma.friendCode.create({
        data: { ownerId: owner, code: newCode(), name: name || "A Sporos player" },
      });
      return NextResponse.json({ code: row.code, name: row.name });
    } catch {
      /* collision — retry with a fresh code */
    }
  }
  return NextResponse.json({ error: "could not create code" }, { status: 500 });
}
