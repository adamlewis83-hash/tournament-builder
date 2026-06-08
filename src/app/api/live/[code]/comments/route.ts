import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/live/:code/comments?since=<iso> -> { comments: [...] }
export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const since = new URL(req.url).searchParams.get("since");
  const comments = await prisma.liveComment.findMany({
    where: {
      code: code.toUpperCase(),
      ...(since ? { createdAt: { gt: new Date(since) } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 300,
  });
  return NextResponse.json({ comments });
}

// POST /api/live/:code/comments  { author, text, targetType?, targetLabel? } -> { comment }
export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const upper = code.toUpperCase();
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const author = String(body.author ?? "").trim().slice(0, 40);
  const text = String(body.text ?? "").trim().slice(0, 280);
  const targetType = body.targetType ? String(body.targetType).slice(0, 10) : null;
  const targetLabel = body.targetLabel ? String(body.targetLabel).slice(0, 40) : null;
  if (!author || !text) {
    return NextResponse.json({ error: "author and text required" }, { status: 400 });
  }

  // Only allow comments on a real live session (no orphan feeds).
  const live = await prisma.liveTournament.findUnique({ where: { code: upper } });
  if (!live) return NextResponse.json({ error: "not found" }, { status: 404 });

  const comment = await prisma.liveComment.create({
    data: { code: upper, author, text, targetType, targetLabel },
  });
  return NextResponse.json({ comment });
}
