"use client";

import { useState } from "react";
import { Tournament } from "@/lib/types";
import { useStore } from "@/lib/store";
import { Button, Card } from "./ui";

export function RyderSetup({ t }: { t: Tournament }) {
  const setRyderTeams = useStore((s) => s.setRyderTeams);
  const generate = useStore((s) => s.generate);

  const [nameA, setNameA] = useState(t.config.teamNames?.[0] ?? "Team A");
  const [nameB, setNameB] = useState(t.config.teamNames?.[1] ?? "Team B");
  const [aText, setAText] = useState(
    t.participants.filter((p) => p.team === 0).map((p) => p.name).join("\n"),
  );
  const [bText, setBText] = useState(
    t.participants.filter((p) => p.team === 1).map((p) => p.name).join("\n"),
  );

  const split = (s: string) =>
    s.split(/[\n,]/).map((x) => x.trim()).filter(Boolean);
  const a = split(aText);
  const b = split(bText);
  const canGenerate = a.length >= 1 && b.length >= 1;

  function handleGenerate() {
    setRyderTeams(t.id, a, b, [nameA.trim() || "Team A", nameB.trim() || "Team B"]);
    generate(t.id);
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <h2 className="font-semibold mb-1">Two teams, head to head</h2>
        <p className="text-sm text-[var(--muted)]">
          Enter each team&apos;s players (one per line). The app builds a Fourball (pairs) session
          and a Singles session — each match is worth a point, ½ for a tie. First team past half the
          points wins the cup. 🏌️
        </p>
      </Card>

      <div className="grid sm:grid-cols-2 gap-5">
        {[
          { name: nameA, setName: setNameA, text: aText, setText: setAText, ring: "ring-cyan-400/40", list: a },
          { name: nameB, setName: setNameB, text: bText, setText: setBText, ring: "ring-rose-400/40", list: b },
        ].map((team, i) => (
          <Card key={i} className={`p-5 ring-1 ${team.ring}`}>
            <input
              value={team.name}
              onChange={(e) => team.setName(e.target.value)}
              className="w-full bg-transparent text-lg font-bold mb-3 border-b border-[var(--border)] focus:border-cyan-400 outline-none pb-1"
            />
            <textarea
              value={team.text}
              onChange={(e) => team.setText(e.target.value)}
              rows={8}
              placeholder={"Player 1\nPlayer 2\nPlayer 3\nPlayer 4"}
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-mono bg-[var(--surface)]"
            />
            <p className="text-sm text-[var(--muted)] mt-2">{team.list.length} players</p>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleGenerate} disabled={!canGenerate} className="px-6 py-3">
          Generate matches →
        </Button>
      </div>
    </div>
  );
}
