import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function genCode(): string {
  const n = Math.floor((crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296) * 1000000);
  return String(n).padStart(6, "0");
}

async function sendEmail(to: string, code: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  const from = process.env.RECOVERY_EMAIL_FROM || "Sporos <noreply@sporos.app>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to,
      subject: `Your Sporos code: ${code}`,
      html: `<div style="font-family:system-ui,Segoe UI,sans-serif;max-width:420px">
        <div style="font-size:20px;font-weight:800;color:#16a34a">🌱 Sporos</div>
        <p>Enter this code to back up or recover your tournaments:</p>
        <p style="font-size:30px;font-weight:800;letter-spacing:6px;margin:14px 0">${code}</p>
        <p style="color:#777;font-size:13px">It expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
      </div>`,
    }),
  });
  return res.ok;
}

// POST /api/recovery/send-code { email } -> emails a 6-digit code
export async function POST(req: Request) {
  if (!process.env.RESEND_API_KEY)
    return NextResponse.json({ error: "not-configured" }, { status: 503 });

  let email = "";
  try {
    ({ email } = await req.json());
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }
  email = String(email || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return NextResponse.json({ error: "invalid-email" }, { status: 400 });

  const code = genCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await prisma.loginCode.upsert({
    where: { email },
    create: { email, code, expiresAt },
    update: { code, expiresAt },
  });

  const sent = await sendEmail(email, code);
  if (!sent) return NextResponse.json({ error: "send-failed" }, { status: 502 });
  return NextResponse.json({ ok: true });
}
