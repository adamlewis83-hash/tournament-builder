"use client";

import { useState } from "react";
import { Tournament } from "@/lib/types";
import { encodeTournament } from "@/lib/share";
import { computeStandings } from "@/lib/standings";
import { bracketChampion } from "@/lib/bracket";
import { Copy, Share2, Printer } from "@/components/icons";
import { Button } from "./ui";
import { ScorePhotoButton } from "./ScorePhotoButton";

function resultsText(t: Tournament): string {
  const lines: string[] = [`🏆 ${t.name} — ${t.sport}`, ""];
  const champ = bracketChampion(t.matches);
  if (champ) {
    const names = champ.map((id) => t.participants.find((p) => p.id === id)?.name ?? "?").join(" & ");
    lines.push(`Champion: ${names}`, "");
  }
  const base = t.matches.filter((m) => m.phase === "rr" || m.phase === "pool");
  if (base.length) {
    const rows = computeStandings(t.participants, base, t.config.tiebreaker);
    lines.push("Standings (W-L, diff):");
    rows.forEach((r) =>
      lines.push(`  ${r.rank}. ${r.name}  ${r.wins}-${r.losses}  (${r.diff > 0 ? "+" : ""}${r.diff})`),
    );
  }
  lines.push("", "Made with Sporos");
  return lines.join("\n");
}

export function ShareBar({ t }: { t: Tournament }) {
  const [msg, setMsg] = useState("");

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMsg(label);
      setTimeout(() => setMsg(""), 1800);
    } catch {
      setMsg("Copy failed");
      setTimeout(() => setMsg(""), 1800);
    }
  }

  function shareLink() {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    copy(`${origin}/?t=${encodeTournament(t)}`, "Link copied!");
  }

  return (
    <div className="no-print flex items-center gap-2">
      {msg && <span className="text-xs font-medium text-[var(--win)]">{msg}</span>}
      <ScorePhotoButton t={t} />
      <Button
        variant="outline"
        className="px-2.5 py-1.5 inline-flex items-center gap-1.5"
        onClick={() => copy(resultsText(t), "Results copied!")}
      >
        <Copy className="h-4 w-4" /> Copy results
      </Button>
      <Button
        variant="outline"
        className="px-2.5 py-1.5 inline-flex items-center gap-1.5"
        onClick={shareLink}
      >
        <Share2 className="h-4 w-4" /> Share link
      </Button>
      <Button
        variant="outline"
        className="px-2.5 py-1.5 inline-flex items-center gap-1.5"
        onClick={() => window.print()}
      >
        <Printer className="h-4 w-4" /> Print
      </Button>
    </div>
  );
}
