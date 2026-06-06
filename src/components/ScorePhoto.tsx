"use client";

import { Tournament, FORMAT_LABELS } from "@/lib/types";
import { getResult } from "@/lib/result";
import { getFinalRows } from "@/lib/records";
import { sportEmoji } from "@/lib/sportEmoji";
import { colorForName } from "@/lib/colors";
import { Avatar } from "./Avatar";

const MEDAL = ["🥇", "🥈", "🥉"];

export function ScorePhoto({ t }: { t: Tournament }) {
  const res = getResult(t);
  const rows = getFinalRows(t).slice(0, 8);
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
        background: "linear-gradient(160deg, #0c3023 0%, #0a1a13 55%, #08140d 100%)",
        color: "#e9f2ec",
      }}
      className="rounded-3xl p-6 border border-emerald-500/30"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-extrabold tracking-tight">
          <span
            style={{ background: "linear-gradient(135deg,#34d399,#10b981)" }}
            className="inline-flex h-6 w-6 items-center justify-center rounded-lg text-sm"
          >
            🌱
          </span>
          <span style={{ color: "#34d399" }}>SEEDED</span>
        </div>
        <span className="text-xs" style={{ color: "#8ba596" }}>
          {date}
        </span>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <span className="text-3xl">{sportEmoji(t.sport)}</span>
        <div className="min-w-0">
          <div className="text-xl font-extrabold leading-tight truncate">{t.name}</div>
          <div className="text-xs" style={{ color: "#8ba596" }}>
            {t.sport} · {FORMAT_LABELS[t.format]}
          </div>
        </div>
      </div>

      {res.winner && (
        <div
          className="mt-4 rounded-2xl px-4 py-3 text-center"
          style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.18), rgba(16,185,129,0.12))", border: "1px solid rgba(251,191,36,0.4)" }}
        >
          <div className="text-3xl">🏆</div>
          <div className="text-[10px] font-bold tracking-[0.3em] mt-0.5" style={{ color: "#fbbf24" }}>
            CHAMPION
          </div>
          <div className="text-lg font-extrabold">{res.winner}</div>
        </div>
      )}

      <div className="mt-4 space-y-1.5">
        {rows.map((r, i) => (
          <div
            key={`${r.name}-${i}`}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2"
            style={{ background: i === 0 ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.04)" }}
          >
            <span className="w-6 text-center text-sm">{MEDAL[i] ?? `${i + 1}`}</span>
            <Avatar name={r.name} color={colorForName(r.name)} className="h-7 w-7 text-[11px]" />
            <span className="flex-1 font-semibold truncate">{r.name}</span>
            <span className="tabular-nums font-bold" style={{ color: "#8ba596" }}>
              {r.stat}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 text-center text-[11px] font-medium" style={{ color: "#6b8275" }}>
        🌱 Made with Seeded
      </div>
    </div>
  );
}
