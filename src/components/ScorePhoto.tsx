"use client";

import { Tournament, FORMAT_LABELS, GOLF_MODE_LABELS } from "@/lib/types";
import { getResult } from "@/lib/result";
import { getFinalRows } from "@/lib/records";
import { colorForName } from "@/lib/colors";
import { Trophy } from "./icons";
import { SporosMark } from "./SporosMark";
import { Avatar } from "./Avatar";

// Gradient rank badge: gold / silver / bronze for the podium, soft gray otherwise.
function rankStyle(i: number): { background: string; color: string } {
  if (i === 0) return { background: "linear-gradient(135deg,#fde68a,#f59e0b)", color: "#5c3b09" };
  if (i === 1) return { background: "linear-gradient(135deg,#f1f5f9,#94a3b8)", color: "#1f2937" };
  if (i === 2) return { background: "linear-gradient(135deg,#f0c089,#c2773f)", color: "#4a2912" };
  return { background: "#eef2f6", color: "#64748b" };
}

// The actual scorecard, drawn into the shareable photo for golf: one block per
// nine (holes across, players down, nine total at the end), par row on top,
// under-par scores in green. This is what a golfer means by "send the card".
function GolfCardGrid({ t }: { t: Tournament }) {
  const g = t.golf;
  if (!g) return null;
  const players = t.participants.slice(0, 8);
  const start = g.startHole ?? 1;
  const nines: { label: string; from: number }[] =
    g.holes === 18
      ? [
          { label: "OUT", from: 0 },
          { label: "IN", from: 9 },
        ]
      : [{ label: start > 1 ? "IN" : "OUT", from: 0 }];
  const first = (name: string) => name.trim().split(/\s+/)[0].slice(0, 8);

  const cell: React.CSSProperties = {
    padding: "3px 0",
    textAlign: "center",
    fontVariantNumeric: "tabular-nums",
    fontSize: 10,
  };
  const nameCell: React.CSSProperties = {
    ...cell,
    textAlign: "left",
    paddingLeft: 6,
    fontWeight: 600,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: 62,
  };

  return (
    <div className="mt-4 space-y-2">
      {nines.map(({ label, from }) => {
        const count = Math.min(9, g.holes - from);
        const idx = Array.from({ length: count }, (_, i) => from + i);
        const isLast = from + count >= g.holes;
        return (
          <div
            key={label}
            style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f1f5f9", color: "#64748b" }}>
                  <th style={{ ...nameCell, fontWeight: 700, fontSize: 9 }}>HOLE</th>
                  {idx.map((h) => (
                    <th key={h} style={{ ...cell, fontWeight: 700 }}>
                      {start + h}
                    </th>
                  ))}
                  <th style={{ ...cell, fontWeight: 800 }}>{label}</th>
                  {isLast && g.holes === 18 && <th style={{ ...cell, fontWeight: 800 }}>TOT</th>}
                </tr>
                <tr style={{ color: "#94a3b8", borderTop: "1px solid #e2e8f0" }}>
                  <td style={{ ...nameCell, fontWeight: 500 }}>Par</td>
                  {idx.map((h) => (
                    <td key={h} style={cell}>
                      {g.pars[h]}
                    </td>
                  ))}
                  <td style={{ ...cell, fontWeight: 600 }}>
                    {idx.reduce((a, h) => a + g.pars[h], 0)}
                  </td>
                  {isLast && g.holes === 18 && (
                    <td style={{ ...cell, fontWeight: 600 }}>
                      {g.pars.reduce((a, b) => a + b, 0)}
                    </td>
                  )}
                </tr>
              </thead>
              <tbody>
                {players.map((p) => {
                  const card = g.scores[p.id] ?? [];
                  const nine = idx.reduce((a, h) => a + (card[h] ?? 0), 0);
                  const nineDone = idx.every((h) => card[h] != null);
                  const tot = card.slice(0, g.holes).reduce((a: number, v) => a + (v ?? 0), 0);
                  const totDone = Array.from({ length: g.holes }, (_, h) => card[h]).every(
                    (v) => v != null,
                  );
                  return (
                    <tr key={p.id} style={{ borderTop: "1px solid #eef2f6" }}>
                      <td style={nameCell}>{first(p.name)}</td>
                      {idx.map((h) => {
                        const s = card[h];
                        const under = s != null && s < g.pars[h];
                        return (
                          <td
                            key={h}
                            style={{
                              ...cell,
                              color: under ? "#16a34a" : "#0f172a",
                              fontWeight: under ? 700 : 400,
                            }}
                          >
                            {s ?? "–"}
                          </td>
                        );
                      })}
                      <td style={{ ...cell, fontWeight: 700 }}>{nineDone ? nine : "–"}</td>
                      {isLast && g.holes === 18 && (
                        <td style={{ ...cell, fontWeight: 800 }}>{totDone ? tot : "–"}</td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

export function ScorePhoto({ t }: { t: Tournament }) {
  const res = getResult(t);
  const rows = getFinalRows(t).slice(0, 8);
  const membersOf = (name: string) =>
    t.participants.find((p) => p.name === name)?.members ?? [];
  const date = new Date(t.updatedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      style={{
        width: 400,
        fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        background: "#ffffff",
        color: "#0f172a",
        boxShadow: "0 24px 60px -20px rgba(15,23,42,0.35)",
      }}
      className="rounded-3xl overflow-hidden border border-[#e6efe9]"
    >
      {/* thin brand accent */}
      <div style={{ height: 5, background: "linear-gradient(90deg,#34d399,#16a34a)" }} />

      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-extrabold tracking-tight">
            <span
              style={{ background: "linear-gradient(135deg,#34d399,#10b981)", color: "#06281c" }}
              className="inline-flex h-6 w-6 items-center justify-center rounded-lg"
            >
              <SporosMark className="h-4 w-4" />
            </span>
            <span style={{ color: "#16a34a" }}>SPOROS</span>
          </div>
          <span className="text-xs font-medium" style={{ color: "#94a3b8" }}>
            {date}
          </span>
        </div>

        <div className="mt-5">
          <div className="text-2xl font-extrabold leading-tight truncate">{t.name}</div>
          <div className="text-xs font-medium" style={{ color: "#64748b" }}>
            {t.sport} ·{" "}
            {t.format === "golf" ? GOLF_MODE_LABELS[t.config.golfMode] : FORMAT_LABELS[t.format]}
          </div>
        </div>

        {res.winner && (
          <div
            className="mt-4 rounded-2xl px-4 py-3 text-center"
            style={{
              background: "linear-gradient(135deg, #fef9ec, #ecfdf5)",
              border: "1px solid #fcd34d",
            }}
          >
            <Trophy className="h-8 w-8 mx-auto" style={{ color: "#f59e0b" }} />
            <div className="text-[10px] font-bold tracking-[0.3em] mt-0.5" style={{ color: "#b45309" }}>
              CHAMPION
            </div>
            <div className="text-lg font-extrabold">{res.winner}</div>
          </div>
        )}

        {/* Golf: the card itself, both nines — the thing you'd photograph. */}
        {t.format === "golf" && t.golf && <GolfCardGrid t={t} />}

        <div className="mt-4 space-y-1.5">
          {rows.map((r, i) => {
            const rank = r.rank ?? i + 1;
            return (
            <div
              key={`${r.name}-${i}`}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2"
              style={{ background: rank === 1 ? "#ecfdf5" : "#f6f8fa" }}
            >
              <span
                style={rankStyle(rank - 1)}
                className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold tabular-nums"
              >
                {rank}
              </span>
              <Avatar name={r.name} color={colorForName(r.name)} className="h-7 w-7 text-[11px]" />
              <span className="flex-1 min-w-0">
                <span className="block font-semibold truncate">{r.name}</span>
                {membersOf(r.name).length > 0 && (
                  <span className="block text-[10px] truncate" style={{ color: "#94a3b8" }}>
                    {membersOf(r.name).join(" · ")}
                  </span>
                )}
                {/* Golf: the two nines, the way the card was played */}
                {r.sub && (
                  <span className="block text-[10px] tabular-nums truncate" style={{ color: "#94a3b8" }}>
                    {r.sub}
                  </span>
                )}
              </span>
              <span className="tabular-nums font-bold whitespace-nowrap" style={{ color: "#475569" }}>
                {r.stat}
              </span>
            </div>
            );
          })}
        </div>

        <div
          className="mt-4 flex items-center justify-center gap-1 text-[11px] font-medium"
          style={{ color: "#94a3b8" }}
        >
          <SporosMark className="h-3.5 w-3.5" /> Made with Sporos
        </div>
      </div>
    </div>
  );
}
