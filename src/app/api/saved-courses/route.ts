import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/saved-courses?owner=KEY -> { courses: [...] }
export async function GET(req: Request) {
  const owner = new URL(req.url).searchParams.get("owner");
  if (!owner) return NextResponse.json({ courses: [] });
  const row = await prisma.ownedCourses.findUnique({ where: { ownerId: owner } });
  return NextResponse.json({ courses: (row?.data as unknown[]) ?? [] });
}

// PUT /api/saved-courses  { owner, courses } -> replace the whole list for this owner
export async function PUT(req: Request) {
  try {
    const { owner, courses } = await req.json();
    if (!owner || !Array.isArray(courses))
      return NextResponse.json({ error: "missing owner/courses" }, { status: 400 });
    await prisma.ownedCourses.upsert({
      where: { ownerId: owner },
      create: { ownerId: owner, data: courses },
      update: { data: courses },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
}
