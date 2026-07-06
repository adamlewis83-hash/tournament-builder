"use client";

import { useEffect, useRef, useState } from "react";
import { Match, Participant } from "@/lib/types";
import { colorFor } from "@/lib/colors";

// A classic visual bracket: boxes per match, connector lines feeding the next round.
// Read-only (score in the Cards view). Handles the single-elim winners/final tree;
// any losers/placement matches are shown by the card view instead.
const BOX_W = 200;
const BOX_H = 64;
const COL_GAP = 48;
const ROW_GAP = 20;
const HEADER_H = 30; // round-name row above each column

function name(ids: string[], label: string | undefined, participants: Participant[]): string {
  if (!ids.length) return label || "TBD";
  return (
    ids
      .map((id) => participants.find((p) => p.id === id)?.name)
      .filter(Boolean)
      .join(" / ") || label || "TBD"
  );
}

const DEFAULT_FILTER = (m: Match) =>
  m.phase === "winners" || m.phase === "final" || m.phase === "championship";

export function BracketDiagram({
  matches,
  participants,
  matchFilter = DEFAULT_FILTER,
}: {
  matches: Match[];
  participants: Participant[];
  // Which matches make up the tree. Defaults to the single-elim winners/final tree;
  // the custom creator passes a permissive filter to lay its hand-built rounds out.
  matchFilter?: (m: Match) => boolean;
}) {
  const tree = matches.filter(matchFilter);
  if (tree.length === 0) return null;

  const rounds = Array.from(new Set(tree.map((m) => m.round))).sort((a, b) => a - b);
  const byRound = rounds.map((r) => tree.filter((m) => m.round === r).sort((a, b) => a.order - b.order));

  // Feeder graph. Real brackets carry explicit nextMatchId links (handles byes/odd
  // brackets). Hand-built custom events have none, so infer a binary tree by pairing
  // each round's matches into the slot above them in the next round.
  const feedersOf = new Map<string, Match[]>();
  if (tree.some((m) => m.nextMatchId)) {
    for (const m of tree) {
      if (m.nextMatchId) {
        const arr = feedersOf.get(m.nextMatchId) ?? [];
        arr.push(m);
        feedersOf.set(m.nextMatchId, arr);
      }
    }
  } else {
    byRound.forEach((round, ri) => {
      if (ri === 0) return;
      const prev = byRound[ri - 1];
      round.forEach((m, i) => {
        const fs = [prev[2 * i], prev[2 * i + 1]].filter(Boolean);
        if (fs.length) feedersOf.set(m.id, fs);
      });
    });
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
  const totalH = HEADER_H + Math.max(...[...yMid.values()]) + BOX_H / 2 + ROW_GAP;

  // On narrow screens the tree is wider than the viewport and iOS hides scrollbars,
  // which reads as "later rounds are missing." Default to scaling the whole bracket
  // to fit the container, with a toggle to full size (scrollable) for detail.
  const wrapRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  useEffect(() => {
    const measure = () => setContainerW(wrapRef.current?.clientWidth ?? 0);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  const overflows = containerW > 0 && totalW > containerW;
  const scale = overflows && !zoomed ? containerW / totalW : 1;

  // Name columns from the end of the tree so byes/odd first rounds don't mislabel.
  const roundTitle = (ri: number) => {
    const fromEnd = byRound.length - 1 - ri;
    if (fromEnd === 0) return "Final";
    if (fromEnd === 1) return "Semifinals";
    if (fromEnd === 2) return "Quarterfinals";
    const n = byRound[ri].length * 2;
    return Number.isInteger(Math.log2(n)) ? `Round of ${n}` : `Round ${rounds[ri]}`;
  };

  return (
    <div ref={wrapRef}>
      {overflows && (
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            onClick={() => setZoomed((z) => !z)}
            className="rounded-md border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--muted)] hover:bg-[var(--hover)]"
          >
            {zoomed ? "Fit to screen" : "Zoom in 🔍"}
          </button>
        </div>
      )}
      <div className={zoomed ? "overflow-x-auto pb-2" : "overflow-hidden"}>
        <div style={{ width: totalW * scale, height: totalH * scale }}>
          <div
            className="relative origin-top-left"
            style={{ width: totalW, height: totalH, transform: scale !== 1 ? `scale(${scale})` : undefined }}
          >
        {/* Round headers */}
        {byRound.map((_, ri) => (
          <div
            key={ri}
            className="absolute top-0 text-center text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]"
            style={{ left: colX(ri), width: BOX_W }}
          >
            {roundTitle(ri)}
          </div>
        ))}

        <svg className="absolute inset-0 pointer-events-none" width={totalW} height={totalH}>
          {byRound.map((round, ri) =>
            ri === 0
              ? null
              : round.map((m) => {
                  const feeders = feedersOf.get(m.id) ?? [];
                  const px = colX(ri);
                  const fx = colX(ri - 1) + BOX_W;
                  const midx = (fx + px) / 2;
                  const py = yMid.get(m.id)! + HEADER_H;
                  const d = feeders
                    .map((f) => `M ${fx} ${yMid.get(f.id)! + HEADER_H} H ${midx} V ${py}`)
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
            const isFinal = ri === byRound.length - 1;
            const Row = ({
              ids,
              label,
              score,
              win,
              lose,
            }: {
              ids: string[];
              label?: string;
              score: number | null;
              win: boolean;
              lose: boolean;
            }) => {
              const display = name(ids, label, participants);
              const pending = !ids.length;
              return (
                <div
                  className={`flex flex-1 items-center justify-between gap-1.5 px-2.5 text-xs ${
                    win
                      ? "bg-[var(--brand-soft)] font-bold text-[var(--win)]"
                      : lose
                        ? "text-[var(--muted)]"
                        : pending
                          ? "italic text-[var(--muted)]"
                          : "text-[var(--foreground)]"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    {ids.length > 0 && (
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: colorFor(participants, ids[0]) }}
                      />
                    )}
                    <span className="truncate">
                      {win && isFinal ? "🏆 " : ""}
                      {display}
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">{score ?? ""}</span>
                </div>
              );
            };
            return (
              <div
                key={m.id}
                className={`absolute flex flex-col justify-center divide-y divide-[var(--border)] overflow-hidden rounded-xl border bg-[var(--surface)] shadow-sm ${
                  isFinal && decided ? "border-[var(--brand)]/50 ring-1 ring-[var(--brand)]/30" : "border-[var(--border)]"
                }`}
                style={{
                  left: colX(ri),
                  top: HEADER_H + yMid.get(m.id)! - BOX_H / 2,
                  width: BOX_W,
                  height: BOX_H,
                }}
              >
                <Row ids={m.sideA} label={m.sideALabel} score={m.scoreA} win={aWin} lose={bWin} />
                <Row ids={m.sideB} label={m.sideBLabel} score={m.scoreB} win={bWin} lose={aWin} />
              </div>
            );
          }),
        )}
          </div>
        </div>
      </div>
    </div>
  );
}
