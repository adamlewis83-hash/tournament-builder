"use client";

import { useState } from "react";
import { Radio } from "@/components/icons";
import { Tournament } from "@/lib/types";
import { useStore } from "@/lib/store";
import { Button, Card } from "./ui";

export function LivePanel({ t }: { t: Tournament }) {
  const publishLive = useStore((s) => s.publishLive);
  const goOffline = useStore((s) => s.goOffline);
  const setScorers = useStore((s) => s.setScorers);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");
  const [showScorers, setShowScorers] = useState(false);

  const scorers = t.scorers ?? [];
  const isScorer = (name: string) => scorers.some((n) => n.toLowerCase() === name.toLowerCase());
  const toggleScorer = (name: string) =>
    setScorers(
      t.id,
      isScorer(name) ? scorers.filter((n) => n.toLowerCase() !== name.toLowerCase()) : [...scorers, name],
    );

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const joinUrl = t.liveCode ? `${origin}/live/${t.liveCode}` : "";

  async function go() {
    setBusy(true);
    await publishLive(t.id);
    setBusy(false);
  }
  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(""), 1600);
    });
  }

  if (!t.liveCode) {
    return (
      <Card className="no-print p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Radio className="h-4 w-4 text-[var(--brand)]" /> Go live
          </h3>
          <p className="text-sm text-[var(--muted)]">
            Share a join code so everyone can follow live from their phones — and post in the{" "}
            <span className="font-medium text-[var(--foreground)]">💬 cheer feed</span> to hype the
            players. Scores stay yours to enter.
          </p>
        </div>
        <Button onClick={go} disabled={busy}>
          {busy ? "Starting…" : "Go Live →"}
        </Button>
      </Card>
    );
  }

  return (
    <Card className="no-print p-4 border-[var(--win)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 border border-rose-400/40 px-2.5 py-0.5 text-xs font-bold text-rose-300">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400 pulse-ring" /> LIVE
          </span>
          <div>
            <div className="text-sm text-[var(--muted)]">Join code</div>
            <div className="text-2xl font-extrabold tracking-[0.2em] tabular-nums">{t.liveCode}</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {copied && <span className="text-xs font-medium text-[var(--win)]">{copied}</span>}
          <Button variant="outline" className="px-2.5 py-1.5" onClick={() => copy(t.liveCode!, "Code copied!")}>
            Copy code
          </Button>
          <Button variant="outline" className="px-2.5 py-1.5" onClick={() => copy(joinUrl, "Link copied!")}>
            Copy link
          </Button>
          <Button variant="danger" className="px-2.5 py-1.5" onClick={() => goOffline(t.id)}>
            Stop
          </Button>
        </div>
      </div>
      <p className="text-xs text-[var(--muted)] mt-2">
        Anyone can join at <span className="font-mono">{origin.replace(/^https?:\/\//, "")}/live/{t.liveCode}</span>{" "}
        or enter the code on the home screen. Scores sync every couple seconds.
      </p>

      {/* Scorekeepers — let chosen players enter scores from their own phones. */}
      <div className="mt-3 border-t border-[var(--border)] pt-3">
        <button
          type="button"
          onClick={() => setShowScorers((v) => !v)}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="text-sm font-semibold">
            Scorekeepers{scorers.length ? ` · ${scorers.length}` : ""} ✍️
          </span>
          <span className="text-xs text-[var(--muted)]">{showScorers ? "▾ Hide" : "▸ Let players score"}</span>
        </button>
        {showScorers && (
          <div className="mt-2">
            <p className="text-xs text-[var(--muted)] mb-2">
              By default only you enter scores. Tap anyone below to let them keep score from their own
              phone once they join the link — they&apos;re recognized by their profile name, so it must
              match. Their entries sync to everyone.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {t.participants.map((p) => {
                const on = isScorer(p.name);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleScorer(p.name)}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                      on
                        ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]"
                        : "border-[var(--border)] hover:bg-[var(--hover)]"
                    }`}
                  >
                    {on ? "✓ " : "+ "}
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
