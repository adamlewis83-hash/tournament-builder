"use client";

import { useState } from "react";
import { Tournament } from "@/lib/types";
import { encodeTournament } from "@/lib/share";
import { computeStandings } from "@/lib/standings";
import { bracketChampion } from "@/lib/bracket";
import { computeGolf } from "@/lib/golf";
import { eventStandings, isMultiRound } from "@/lib/golfRounds";
import { getResult } from "@/lib/result";
import { Copy, Share2, Printer } from "@/components/icons";
import { Button } from "./ui";
import { ScorePhotoButton } from "./ScorePhotoButton";

// Golf copies the CARD, not W-L standings (it has none): one line per player,
// nines and total, net where handicaps are in play — readable in any chat app.
function golfText(t: Tournament): string {
  const g = t.golf!;
  const lines: string[] = [`⛳ ${t.name}${g.courseName ? ` — ${g.courseName}` : ""}`, ""];
  if (isMultiRound(t)) {
    const rows = eventStandings(t, "net");
    const anyHcp = t.participants.some((p) => (p.handicap ?? 0) > 0);
    rows.forEach((r, i) => {
      // Only rounds actually played — "72 + – + –" is noise, not a card.
      const played = r.rounds.filter((c) => c.thru > 0);
      const per = played.length > 1 ? `${played.map((c) => c.gross).join(" + ")} = ` : "";
      lines.push(
        `${i + 1}. ${r.name}  ${per}${played.length ? r.gross : "–"}${anyHcp && played.length ? ` (net ${r.net})` : ""}`,
      );
    });
  } else {
    const rows = computeGolf(t, "stroke");
    rows.forEach((r, i) => {
      const nines =
        g.holes === 18 && r.outThru === 9 && r.inThru === 9
          ? `${r.outGross} + ${r.inGross} = `
          : "";
      const done = r.thru >= g.holes;
      lines.push(
        `${i + 1}. ${r.name}  ${nines}${done ? r.gross : `${r.gross} thru ${r.thru}`}${
          r.handicap > 0 ? ` (net ${r.net})` : ""
        }`,
      );
    });
  }
  const res = getResult(t);
  if (res.winner) lines.push("", `🏆 ${res.winner}`);
  lines.push("", "Made with Sporos");
  return lines.join("\n");
}

function resultsText(t: Tournament): string {
  if (t.format === "golf" && t.golf) return golfText(t);
  const lines: string[] = [`🏆 ${t.name} — ${t.sport}`, ""];
  const champ = bracketChampion(t.matches);
  if (champ) {
    const names = champ.map((id) => t.participants.find((p) => p.id === id)?.name ?? "?").join(" & ");
    lines.push(`Champion: ${names}`, "");
  }
  const base = t.matches.filter((m) => m.phase === "rr" || m.phase === "pool");
  if (base.length) {
    const rows = computeStandings(t.participants, base, t.config.tiebreaker, t.config.rankByWinPct);
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
    <div className="no-print flex flex-wrap items-center gap-2">
      {msg && <span className="text-xs font-medium text-[var(--win)]">{msg}</span>}
      <ScorePhotoButton t={t} />
      <Button
        variant="outline"
        className="px-2.5 py-1.5 inline-flex items-center gap-1.5"
        onClick={() =>
          copy(resultsText(t), t.format === "golf" ? "Scorecard copied!" : "Results copied!")
        }
      >
        <Copy className="h-4 w-4" /> {t.format === "golf" ? "Copy scorecard" : "Copy results"}
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
