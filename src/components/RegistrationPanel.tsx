"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Tournament } from "@/lib/types";
import { useStore } from "@/lib/store";
import { Avatar } from "./Avatar";
import { Button, Card } from "./ui";
import { colorFor } from "@/lib/colors";
import { fetchRegistrations, removeRegistration } from "@/lib/live";

// Host-side lobby: publish the tournament, share a QR + code, and watch players
// self-register into the pool. Players appear as "reg-*" participants.
export function RegistrationPanel({ t }: { t: Tournament }) {
  const publishLive = useStore((s) => s.publishLive);
  const syncRegistrations = useStore((s) => s.syncRegistrations);
  const [qr, setQr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const code = t.liveCode ?? null;
  const joinUrl =
    code && typeof window !== "undefined" ? `${window.location.origin}/join/${code}` : "";

  useEffect(() => {
    if (!joinUrl) return;
    QRCode.toDataURL(joinUrl, { margin: 1, width: 240 })
      .then(setQr)
      .catch(() => setQr(null));
  }, [joinUrl]);

  // Poll the registration pool and merge it into the participant list.
  useEffect(() => {
    if (!code) return;
    let alive = true;
    const tick = async () => {
      const regs = await fetchRegistrations(code);
      if (alive)
        syncRegistrations(
          t.id,
          regs.map((r) => ({ id: r.id, name: r.name, handicap: r.handicap, photo: r.photo })),
        );
    };
    tick();
    const iv = setInterval(tick, 3500);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [code, t.id, syncRegistrations]);

  async function openRegistration() {
    setBusy(true);
    await publishLive(t.id);
    setBusy(false);
  }

  async function kick(participantId: string) {
    if (!code || !participantId.startsWith("reg-")) return;
    await removeRegistration(code, participantId.slice(4));
    const regs = await fetchRegistrations(code);
    syncRegistrations(
      t.id,
      regs.map((r) => ({ id: r.id, name: r.name, handicap: r.handicap, photo: r.photo })),
    );
  }

  if (!code) {
    return (
      <Card className="p-5 text-center">
        <h3 className="font-semibold">Let players add themselves</h3>
        <p className="text-sm text-[var(--muted)] mt-1 mb-3">
          Open registration and share a QR/code — each player enters their own name
          {t.format === "golf" ? ", handicap," : ""} and photo. No typing for you.
        </p>
        <Button onClick={openRegistration} disabled={busy}>
          {busy ? "Opening…" : "Open registration →"}
        </Button>
      </Card>
    );
  }

  const pool = t.participants.filter((p) => p.id.startsWith("reg-"));

  return (
    <Card className="p-5 space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
        {qr && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt="Join QR code" className="h-44 w-44 rounded-xl bg-white p-2 mx-auto sm:mx-0" />
        )}
        <div className="text-center sm:text-left">
          <p className="text-sm text-[var(--muted)]">Scan the code, or go to</p>
          <p className="font-mono font-semibold break-all">
            {joinUrl.replace(/^https?:\/\//, "")}
          </p>
          <p className="mt-3 text-sm text-[var(--muted)]">and enter join code</p>
          <p className="text-3xl font-display font-bold tracking-[0.3em] text-[var(--brand)]">{code}</p>
          <Button
            variant="outline"
            className="mt-3"
            onClick={() => navigator.clipboard?.writeText(joinUrl).catch(() => {})}
          >
            Copy link
          </Button>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold mb-2">In the lobby ({pool.length})</p>
        {pool.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Waiting for players to join…</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {pool.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] pl-1 pr-2 py-1"
              >
                <Avatar name={p.name} color={colorFor(t.participants, p.id)} photo={p.photo} />
                <span className="text-sm font-medium">
                  {p.name}
                  {p.handicap != null ? <span className="text-[var(--muted)]"> · hcp {p.handicap}</span> : null}
                </span>
                <button
                  onClick={() => kick(p.id)}
                  className="text-[var(--muted)] hover:text-red-500 font-bold leading-none px-1"
                  title={`Kick ${p.name}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
