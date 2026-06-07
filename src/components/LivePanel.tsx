"use client";

import { useState } from "react";
import { Radio } from "lucide-react";
import { Tournament } from "@/lib/types";
import { useStore } from "@/lib/store";
import { Button, Card } from "./ui";

export function LivePanel({ t }: { t: Tournament }) {
  const publishLive = useStore((s) => s.publishLive);
  const goOffline = useStore((s) => s.goOffline);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");

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
            Share a join code so everyone can follow &amp; enter scores from their phones — updates in
            real time.
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
    </Card>
  );
}
