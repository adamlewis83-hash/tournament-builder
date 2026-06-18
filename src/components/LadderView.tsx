"use client";

import { useState } from "react";
import { Tournament } from "@/lib/types";
import { useStore } from "@/lib/store";
import { colorFor } from "@/lib/colors";
import { Avatar } from "./Avatar";
import { Button, Card } from "./ui";

export function LadderView({ t }: { t: Tournament }) {
  const record = useStore((s) => s.recordLadderMatch);
  const spectator = t.spectator === true;
  const order = t.ladder?.order ?? t.participants.map((p) => p.id);
  const byId = (id: string) => t.participants.find((p) => p.id === id);

  // Win/loss record from recorded challenges.
  const rec: Record<string, { w: number; l: number }> = {};
  t.participants.forEach((p) => (rec[p.id] = { w: 0, l: 0 }));
  t.matches.forEach((m) => {
    if (m.scoreA == null || m.scoreB == null || m.scoreA === m.scoreB) return;
    const aWin = m.scoreA > m.scoreB;
    const a = m.sideA[0];
    const b = m.sideB[0];
    if (rec[a]) aWin ? rec[a].w++ : rec[a].l++;
    if (rec[b]) aWin ? rec[b].l++ : rec[b].w++;
  });

  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [sa, setSa] = useState("");
  const [sb, setSb] = useState("");

  function submit() {
    if (!a || !b || a === b || sa === "" || sb === "") return;
    record(t.id, a, b, Number(sa), Number(sb));
    setA("");
    setB("");
    setSa("");
    setSb("");
  }

  const history = [...t.matches].reverse().slice(0, 12);

  return (
    <div className="space-y-4">
      {!spectator && (
        <Card className="p-4 space-y-2">
          <h3 className="font-semibold text-sm">Record a challenge</h3>
          <div className="flex flex-wrap items-center gap-2">
            <Pick value={a} exclude={b} options={t.participants} onChange={setA} />
            <ScoreIn value={sa} onChange={setSa} />
            <span className="text-[var(--muted)]">vs</span>
            <ScoreIn value={sb} onChange={setSb} />
            <Pick value={b} exclude={a} options={t.participants} onChange={setB} />
            <Button onClick={submit} disabled={!a || !b || a === b || sa === "" || sb === ""}>
              Record
            </Button>
          </div>
          <p className="text-xs text-[var(--muted)]">
            Beat someone ranked above you and you swap spots on the ladder.
          </p>
        </Card>
      )}

      <Card bare className="rounded-2xl border border-[var(--border)] overflow-hidden">
        <div className="px-4 py-2 text-xs uppercase tracking-widest text-[var(--muted)] font-bold border-b border-[var(--border)]">
          The Ladder
        </div>
        <ul>
          {order.map((id, i) => {
            const p = byId(id);
            if (!p) return null;
            const r = rec[id] ?? { w: 0, l: 0 };
            return (
              <li
                key={id}
                className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--border)] last:border-0"
              >
                <span className="w-6 text-center font-bold text-[var(--muted)]">{i + 1}</span>
                <Avatar
                  name={p.name}
                  color={colorFor(t.participants, id)}
                  photo={p.photo}
                  className="h-7 w-7 text-[11px]"
                />
                <span className="flex-1 font-medium truncate">{p.name}</span>
                <span className="text-sm text-[var(--muted)] tabular-nums">
                  {r.w}–{r.l}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      {history.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-2">Recent results</h3>
          <ul className="space-y-1.5 text-sm">
            {history.map((m) => {
              const aN = byId(m.sideA[0])?.name ?? "—";
              const bN = byId(m.sideB[0])?.name ?? "—";
              const aWin = (m.scoreA ?? 0) > (m.scoreB ?? 0);
              return (
                <li key={m.id} className="flex items-center gap-2">
                  <span className={aWin ? "font-semibold" : "text-[var(--muted)]"}>{aN}</span>
                  <span className="tabular-nums text-[var(--muted)]">
                    {m.scoreA}–{m.scoreB}
                  </span>
                  <span className={!aWin ? "font-semibold" : "text-[var(--muted)]"}>{bN}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Pick({
  value,
  exclude,
  options,
  onChange,
}: {
  value: string;
  exclude: string;
  options: Tournament["participants"];
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-[var(--border)] px-2 py-2 text-sm bg-[var(--surface)] max-w-[8.5rem]"
    >
      <option value="">Player…</option>
      {options
        .filter((p) => p.id !== exclude)
        .map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
    </select>
  );
}

function ScoreIn({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="number"
      inputMode="numeric"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="–"
      className="w-12 rounded-md border border-[var(--border)] bg-[var(--input)] px-1 py-1.5 text-center tabular-nums outline-none focus:border-[var(--brand)]"
    />
  );
}
