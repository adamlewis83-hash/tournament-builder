import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PHOTO = 80_000; // ~80KB cap for the inline thumbnail data-URL

// GET /api/live/:code/register -> { registrations: [...] }
export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const registrations = await prisma.liveRegistration.findMany({
    where: { code: code.toUpperCase() },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  return NextResponse.json({ registrations });
}

// POST /api/live/:code/register  { name, handicap?, photo? } -> { registration }
export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const upper = code.toUpperCase();
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim().slice(0, 40);
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const hcRaw = body.handicap;
  const handicap =
    hcRaw === "" || hcRaw === null || hcRaw === undefined || Number.isNaN(Number(hcRaw))
      ? null
      : Number(hcRaw);

  let photo: string | null = null;
  if (typeof body.photo === "string" && body.photo.startsWith("data:image/")) {
    photo = body.photo.length <= MAX_PHOTO ? body.photo : null;
  }

  // Only allow registering against a real live session.
  const live = await prisma.liveTournament.findUnique({ where: { code: upper } });
  if (!live) return NextResponse.json({ error: "not found" }, { status: 404 });

  const registration = await prisma.liveRegistration.create({
    data: { code: upper, name, handicap, photo },
  });
  return NextResponse.json({ registration });
}

// DELETE /api/live/:code/register  { id } -> { ok: true }  (host kicks a player)
export async function DELETE(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const id = String(body.id ?? "");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.liveRegistration.deleteMany({ where: { id, code: code.toUpperCase() } });
  return NextResponse.json({ ok: true });
}
