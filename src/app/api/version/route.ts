import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/version -> { sha } — which deploy is serving right now. The iOS
// shell can sit in the background for days without a page load; the client
// compares this against the sha it booted with and offers a refresh.
export async function GET() {
  return NextResponse.json({ sha: process.env.VERCEL_GIT_COMMIT_SHA ?? null });
}
