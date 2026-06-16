"use client";

import { useState } from "react";
import { getLibraryKey, sendRecoveryCode, verifyRecoveryCode } from "@/lib/library";
import { Mail } from "@/components/icons";
import { Button } from "./ui";

export const RECOVERY_EMAIL_KEY = "sporos-recovery-email";

// Email backup / restore (no password, one-time code). Reused by the nudge + sync panel.
export function EmailBackup({
  onRecovered,
  onBackedUp,
  compact,
}: {
  onRecovered: (key: string) => void;
  onBackedUp?: () => void;
  compact?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function send() {
    setBusy(true);
    setMsg("");
    const r = await sendRecoveryCode(email.trim());
    setBusy(false);
    if (r.notConfigured) return setMsg("Email backup isn't set up yet.");
    if (!r.ok) return setMsg("Couldn't send — check the address and try again.");
    setStage("code");
    setMsg(`We emailed a 6-digit code to ${email.trim()}.`);
  }

  async function verify() {
    setBusy(true);
    setMsg("");
    const res = await verifyRecoveryCode(email.trim(), code.trim(), getLibraryKey());
    setBusy(false);
    if (!res) return setMsg("That code is invalid or expired.");
    localStorage.setItem(RECOVERY_EMAIL_KEY, email.trim());
    if (res.recovered && res.libraryKey !== getLibraryKey()) {
      onRecovered(res.libraryKey);
    } else {
      setStage("email");
      setCode("");
      setMsg(`✓ Signed in as ${email.trim()}. Use this email on any device to sync.`);
      onBackedUp?.();
    }
  }

  return (
    <div className={compact ? "" : "rounded-lg border border-[var(--border)] p-3"}>
      {!compact && (
        <>
          <div className="text-sm font-semibold flex items-center gap-2">
            <Mail className="h-4 w-4 text-[var(--brand)]" /> Sign in with email
          </div>
          <p className="text-xs text-[var(--muted)] mt-0.5 mb-2">
            No password — we email you a 6-digit code. Use the same email on any device to sync your
            tournaments.
          </p>
        </>
      )}
      {stage === "email" ? (
        <div className="flex items-center gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && email.trim() && send()}
            placeholder="you@email.com"
            className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
          />
          <Button onClick={send} disabled={!email.trim() || busy}>
            {busy ? "…" : "Send code"}
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            onKeyDown={(e) => e.key === "Enter" && code.trim() && verify()}
            placeholder="6-digit code"
            className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-mono tracking-widest"
          />
          <Button onClick={verify} disabled={code.length < 6 || busy}>
            {busy ? "…" : "Confirm"}
          </Button>
          <Button variant="outline" className="px-2.5 py-2" onClick={() => setStage("email")}>
            ↺
          </Button>
        </div>
      )}
      {msg && <p className="text-xs text-[var(--brand)] mt-1.5">{msg}</p>}
    </div>
  );
}
