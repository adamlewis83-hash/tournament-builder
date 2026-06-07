"use client";

import { Medal } from "@phosphor-icons/react";
import { Tournament, FORMAT_LABELS } from "@/lib/types";
import { getResult } from "@/lib/result";
import { getFinalRows } from "@/lib/records";
import { colorForName } from "@/lib/colors";
import { Sprout, Trophy } from "./icons";
import { Avatar } from "./Avatar";

const MEDAL_COLORS = ["#f59e0b", "#94a3b8", "#c2773f"]; // gold / silver / bronze

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
              <Sprout className="h-4 w-4" />
            </span>
            <span style={{ color: "#16a34a" }}>SEEDED</span>
          </div>
          <span className="text-xs font-medium" style={{ color: "#94a3b8" }}>
            {date}
          </span>
        </div>

        <div className="mt-5">
          <div className="text-2xl font-extrabold leading-tight truncate">{t.name}</div>
          <div className="text-xs font-medium" style={{ color: "#64748b" }}>
            {t.sport} · {FORMAT_LABELS[t.format]}
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

        <div className="mt-4 space-y-1.5">
          {rows.map((r, i) => (
            <div
              key={`${r.name}-${i}`}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2"
              style={{ background: i === 0 ? "#ecfdf5" : "#f6f8fa" }}
            >
              <span className="w-6 flex justify-center">
                {i < 3 ? (
                  <Medal weight="fill" size={18} color={MEDAL_COLORS[i]} />
                ) : (
                  <span className="text-sm font-semibold" style={{ color: "#94a3b8" }}>
                    {i + 1}
                  </span>
                )}
              </span>
              <Avatar name={r.name} color={colorForName(r.name)} className="h-7 w-7 text-[11px]" />
              <span className="flex-1 font-semibold truncate">{r.name}</span>
              <span className="tabular-nums font-bold" style={{ color: "#475569" }}>
                {r.stat}
              </span>
            </div>
          ))}
        </div>

        <div
          className="mt-4 flex items-center justify-center gap-1 text-[11px] font-medium"
          style={{ color: "#94a3b8" }}
        >
          <Sprout className="h-3.5 w-3.5" /> Made with Seeded
        </div>
      </div>
    </div>
  );
}
