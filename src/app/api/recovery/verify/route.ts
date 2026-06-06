import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/recovery/verify { email, code, libraryKey }
//  - valid code + email already linked  -> { libraryKey: <existing>, recovered: true }
//  - valid code + email not linked yet  -> links this device's key, { libraryKey, recovered: false }
export async function POST(req: Request) {
  let email = "";
  let code = "";
  let libraryKey = "";
  try {
    ({ email, code, libraryKey } = await req.json());
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }
  email = String(email || "").trim().toLowerCase();
  code = String(code || "").trim();
  libraryKey = String(libraryKey || "").trim().toUpperCase();
  if (!email || !code || !libraryKey)
    return NextResponse.json({ error: "missing-fields" }, { status: 400 });

  const rec = await prisma.loginCode.findUnique({ where: { email } });
  if (!rec || rec.code !== code || rec.expiresAt < new Date())
    return NextResponse.json({ error: "invalid-code" }, { status: 400 });

  await prisma.loginCode.delete({ where: { email } }).catch(() => {});

  const link = await prisma.emailLink.findUnique({ where: { email } });
  if (link) {
    return NextResponse.json({ libraryKey: link.libraryKey, recovered: true });
  }
  await prisma.emailLink.create({ data: { email, libraryKey } });
  return NextResponse.json({ libraryKey, recovered: false });
}
