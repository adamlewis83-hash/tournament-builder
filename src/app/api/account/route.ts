import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// DELETE /api/account  { owner } -> permanently erase everything stored under
// this library key: the email link (the only PII we hold), any pending login
// codes for those emails, and all cloud backups (tournaments, friends, courses).
// Hard deletes, no tombstones — the key is abandoned client-side afterwards, so
// nothing can re-push under it. Possession of the key is ownership, matching
// every other library endpoint.
export async function DELETE(req: Request) {
  try {
    const { owner } = await req.json();
    if (!owner || typeof owner !== "string")
      return NextResponse.json({ error: "missing owner" }, { status: 400 });

    const links = await prisma.emailLink.findMany({ where: { libraryKey: owner } });
    const emails = links.map((l) => l.email);

    await prisma.$transaction([
      prisma.loginCode.deleteMany({ where: { email: { in: emails } } }),
      prisma.emailLink.deleteMany({ where: { libraryKey: owner } }),
      prisma.ownedTournament.deleteMany({ where: { ownerId: owner } }),
      prisma.ownedFriends.deleteMany({ where: { ownerId: owner } }),
      prisma.ownedCourses.deleteMany({ where: { ownerId: owner } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
}
