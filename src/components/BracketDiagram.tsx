"use client";

import { Match, Participant } from "@/lib/types";

// A classic visual bracket: boxes per match, connector lines feeding the next round.
// Read-only (score in the Cards view). Handles the single-elim winners/final tree;
// any losers/placement matches are shown by the card view instead.
const BOX_W = 168;
const BOX_H = 56;
const COL_GAP = 44;
const ROW_GAP = 18;

function name(ids: string[], label: string | undefined, participants: Participant[]): string {
  if (!ids.length) return label || "—";
  return (
    ids
      .map((id) => participants.find((p) => p.id === id)?.name)
      .filter(Boolean)
      .join(" / ") || label || "—"
  );
}

export function BracketDiagram({
  matches,
  participants,
}: {
  matches: Match[];
  participants: Participant[];
}) {
  const tree = matches.filter(
    (m) => m.phase === "winners" || m.phase === "final" || m.phase === "championship",
  );
  if (tree.length === 0) return null;

  const rounds = Array.from(new Set(tree.map((m) => m.round))).sort((a, b) => a - b);
  const byRound = rounds.map((r) => tree.filter((m) => m.round === r).sort((a, b) => a.order - b.order));

  // Feeder graph from nextMatchId so byes/odd brackets still connect correctly.
  const feedersOf = new Map<string, Match[]>();
  for (const m of tree) {
    if (m.nextMatchId) {
      const arr = feedersOf.get(m.nextMatchId) ?? [];
      arr.push(m);
      feedersOf.set(m.nextMatchId, arr);
    }
  }

  const unit = BOX_H + ROW_GAP;
  const yMid = new Map<string, number>();
  byRound.forEach((round, ri) => {
    round.forEach((m, i) => {
      const feeders = (feedersOf.get(m.id) ?? [])
        .map((f) => yMid.get(f.id))
        .filter((v): v is number => v != null);
      if (ri === 0 || feeders.length === 0) {
        // first round (or a player who byed in): stack by position, spaced for the round depth
        yMid.set(m.id, i * unit * Math.pow(2, ri) + (Math.pow(2, ri) * unit) / 2 - ROW_GAP / 2);
      } else {
        yMid.set(m.id, feeders.reduce((s, v) => s + v, 0) / feeders.length);
      }
    });
  });

  const colX = (c: number) => c * (BOX_W + COL_GAP);
  const totalW = colX(byRound.length - 1) + BOX_W;
  const totalH = Math.max(...[...yMid.values()]) + BOX_H / 2 + ROW_GAP;

  return (
    <div className="overflow-x-auto pb-2">
      <div className="relative" style={{ width: totalW, height: totalH }}>
        <svg className="absolute inset-0 pointer-events-none" width={totalW} height={totalH}>
          {byRound.map((round, ri) =>
            ri === 0
              ? null
              : round.map((m) => {
                  const feeders = feedersOf.get(m.id) ?? [];
                  const px = colX(ri);
                  const fx = colX(ri - 1) + BOX_W;
                  const midx = (fx + px) / 2;
                  const py = yMid.get(m.id)!;
                  const d = feeders
                    .map((f) => `M ${fx} ${yMid.get(f.id)!} H ${midx} V ${py}`)
                    .join(" ");
                  return (
                    <path
                      key={m.id}
                      d={`${d} M ${midx} ${py} H ${px}`}
                      stroke="var(--border)"
                      strokeWidth="2"
                      fill="none"
                    />
                  );
                }),
          )}
        </svg>

        {byRound.map((round, ri) =>
          round.map((m) => {
            const decided = m.scoreA != null && m.scoreB != null && m.scoreA !== m.scoreB;
            const aWin = decided && (m.scoreA as number) > (m.scoreB as number);
            const bWin = decided && (m.scoreB as number) > (m.scoreA as number);
            const Row = ({
              ids,
              label,
              score,
              win,
            }: {
              ids: string[];
              label?: string;
              score: number | null;
              win: boolean;
            }) => (
              <div
                className={`flex items-center justify-between gap-1 px-2 h-[27px] text-xs ${
                  win ? "font-bold text-[var(--win)]" : "text-[var(--foreground)]"
                }`}
              >
                <span className="truncate">{name(ids, label, participants)}</span>
                <span className="tabular-nums shrink-0">{score ?? ""}</span>
              </div>
            );
            return (
              <div
                key={m.id}
                className="absolute rounded-md border border-[var(--border)] bg-[var(--surface)] overflow-hidden flex flex-col justify-center divide-y divide-[var(--border)]"
                style={{
                  left: colX(ri),
                  top: yMid.get(m.id)! - BOX_H / 2,
                  width: BOX_W,
                  height: BOX_H,
                }}
              >
                <Row ids={m.sideA} label={m.sideALabel} score={m.scoreA} win={aWin} />
                <Row ids={m.sideB} label={m.sideBLabel} score={m.scoreB} win={bWin} />
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}
