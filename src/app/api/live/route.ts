import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
function makeCode(len = 5): string {
  let s = "";
  for (let i = 0; i < len; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

// POST /api/live  { data } -> { code, data, version }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = body?.data;
    if (!data) return NextResponse.json({ error: "missing data" }, { status: 400 });

    for (let attempt = 0; attempt < 6; attempt++) {
      const code = makeCode();
      try {
        const row = await prisma.liveTournament.create({ data: { code, data, version: 0 } });
        return NextResponse.json({ code: row.code, data: row.data, version: row.version });
      } catch {
        // unique collision on code — retry
      }
    }
    return NextResponse.json({ error: "could not allocate code" }, { status: 500 });
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
}
