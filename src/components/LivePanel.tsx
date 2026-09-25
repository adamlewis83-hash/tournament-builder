"use client";

import { useEffect, useState } from "react";
import { Radio } from "@/components/icons";
import { Tournament } from "@/lib/types";
import { useStore } from "@/lib/store";
import { fetchLinks } from "@/lib/feed";
import { getLibraryKey } from "@/lib/library";
import { Button } from "./ui";
import { CollapsibleCard } from "./CollapsibleCard";
import { InfoTip } from "./InfoTip";

export function LivePanel({ t }: { t: Tournament }) {
  const publishLive = useStore((s) => s.publishLive);
  const goOffline = useStore((s) => s.goOffline);
  const setScorers = useStore((s) => s.setScorers);
  const patchTournament = useStore((s) => s.patchTournament);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");
  const [showScorers, setShowScorers] = useState(false);
  const [newScorer, setNewScorer] = useState("");
  const friends = useStore((s) => s.friends);
  // Linked friends' names are the profile names on their own phones, which is
  // exactly what a scorekeeper grant is checked against. Picking one of those
  // can't miss the way a hand typed "Collin" misses a phone set to "Collin L".
  const [linkedNames, setLinkedNames] = useState<string[]>([]);
  useEffect(() => {
    if (!showScorers) return;
    let live = true;
    fetchLinks(getLibraryKey()).then((list) => {
      if (live) setLinkedNames(list.flatMap((f) => (f.name?.trim() ? [f.name.trim()] : [])));
    });
    return () => {
      live = false;
    };
  }, [showScorers]);

  const scorers = t.scorers ?? [];
  const isScorer = (name: string) => scorers.some((n) => n.toLowerCase() === name.toLowerCase());
  const toggleScorer = (name: string) =>
    setScorers(
      t.id,
      isScorer(name) ? scorers.filter((n) => n.toLowerCase() !== name.toLowerCase()) : [...scorers, name],
    );
  // Scorekeepers who aren't in the field — e.g. a spouse or friend running the scorecard.
  const extraScorers = scorers.filter(
    (n) => !t.participants.some((p) => p.name.trim().toLowerCase() === n.trim().toLowerCase()),
  );
  // Friends who could keep score but aren't players or scorekeepers yet: linked
  // accounts first (their names are sure to match), then the saved friends list.
  const taken = (name: string) =>
    isScorer(name) ||
    t.participants.some((p) => p.name.trim().toLowerCase() === name.trim().toLowerCase());
  const suggestions: { name: string; linked: boolean }[] = [];
  for (const name of linkedNames)
    if (!taken(name) && !suggestions.some((x) => x.name.toLowerCase() === name.toLowerCase()))
      suggestions.push({ name, linked: true });
  for (const f of friends) {
    const name = f.name.trim();
    if (name && !taken(name) && !suggestions.some((x) => x.name.toLowerCase() === name.toLowerCase()))
      suggestions.push({ name, linked: false });
  }
  const addScorerByName = () => {
    const v = newScorer.trim();
    if (!v || isScorer(v)) {
      setNewScorer("");
      return;
    }
    setScorers(t.id, [...scorers, v]);
    setNewScorer("");
  };

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
      <CollapsibleCard
        id="go-live"
        title={
          <span className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-[var(--brand)]" /> Go live
          </span>
        }
        summary="share a join code"
        defaultOpen
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[var(--muted)] max-w-prose">
            Share a join code so everyone can follow live from their phones — and post in the{" "}
            <span className="font-medium text-[var(--foreground)]">💬 cheer feed</span> to hype the
            players. Scores stay yours to enter.
          </p>
          <Button onClick={go} disabled={busy}>
            {busy ? "Starting…" : "Go Live →"}
          </Button>
        </div>
      </CollapsibleCard>
    );
  }

  return (
    <CollapsibleCard
      id="live-panel"
      className="border-[var(--win)]"
      // The code lives in the title, so the card folded still shows the one thing
      // people walk over to the host's phone to read.
      title={
        <span className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 border border-rose-400/40 px-2.5 py-0.5 text-xs font-bold text-rose-300">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400 pulse-ring" /> LIVE
          </span>
          <span className="text-base font-extrabold tracking-[0.2em] tabular-nums">{t.liveCode}</span>
        </span>
      }
      summary={`${scorers.length ? `${scorers.length} scorekeeper${scorers.length === 1 ? "" : "s"}` : "share & scorekeepers"}`}
      defaultOpen
    >
      <div className="flex flex-wrap items-center justify-end gap-3">
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

      {/* Scorekeepers — let chosen players enter scores from their own phones. */}
      <div className="mt-3 border-t border-[var(--border)] pt-3">
        <button
          type="button"
          onClick={() => setShowScorers((v) => !v)}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="text-sm font-semibold">
            Scorekeepers{scorers.length ? ` · ${scorers.length}` : ""} ✍️
          </span>
          <span className="text-xs text-[var(--muted)]">{showScorers ? "▾ Hide" : "▸ Let players score"}</span>
        </button>
        {showScorers && (
          <div className="mt-2">
            <div className="mb-2 text-xs text-[var(--muted)]">
              <span className="mr-1.5">
                Tap a player — or add anyone by name — and they can keep score from their own phone.
              </span>
              <InfoTip
                className="inline-block align-middle"
                label="How scorekeepers work"
                title="How scorekeepers work:"
              >
                <ol className="list-decimal space-y-1 pl-4">
                  <li>Players keep score from their own phones: they open your live link, tap <b>I&apos;m playing</b> and pick their name. Turn that off below to keep the scoring to you and the names you pick here.</li>
                  <li>Everything a player or scorekeeper enters syncs live to everyone.</li>
                  <li>Scorekeepers must <b>join your live link or code</b> on their phone first — the grant upgrades them from watching to scoring.</li>
                  <li>They&apos;re recognized by the <b>profile name on their phone</b> (Settings → Your profile), not the name on the matchup. If it doesn&apos;t match the name you picked here, their screen shows a <b>&ldquo;That&apos;s me&rdquo;</b> prompt listing these names — one tap claims it. If someone says it won&apos;t let them score, that prompt is the answer.</li>
                  <li>Scorekeepers can enter and fix scores — nothing else. No adding players, changing setup, or reseeding. Tap a name off here to revoke anytime.</li>
                  <li>Anyone can be a scorekeeper — a spouse or friend who isn&apos;t playing keeps book just fine.</li>
                </ol>
              </InfoTip>
            </div>
            <label className="mb-2 flex items-center justify-between gap-3 rounded-lg bg-[var(--subtle)] px-3 py-2 text-sm">
              <span>
                <span className="block font-medium">Players keep score from their phones</span>
                <span className="block text-[11px] text-[var(--muted)]">
                  Off = only you and the scorekeepers below.
                </span>
              </span>
              <input
                type="checkbox"
                checked={t.playersScore !== false}
                onChange={(e) => patchTournament(t.id, { playersScore: e.target.checked })}
                className="h-5 w-5 shrink-0 accent-[var(--brand)]"
              />
            </label>
            <div className="flex flex-wrap gap-1.5">
              {t.participants.map((p) => {
                const on = isScorer(p.name);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleScorer(p.name)}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                      on
                        ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]"
                        : "border-[var(--border)] hover:bg-[var(--hover)]"
                    }`}
                  >
                    {on ? "✓ " : "+ "}
                    {p.name}
                  </button>
                );
              })}
              {/* Non-player scorekeepers: shown as removable chips since they have no player toggle. */}
              {extraScorers.map((n) => (
                <span
                  key={`extra-${n}`}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--brand)] bg-[var(--brand-soft)] pl-2.5 pr-1.5 py-1 text-xs font-medium text-[var(--brand)]"
                >
                  ✓ {n}
                  {/* A linked name may be a player whose phone spells it differently. */}
                  <span className="text-[10px] opacity-70">
                    {linkedNames.some((x) => x.toLowerCase() === n.trim().toLowerCase())
                      ? "🔗 linked"
                      : "(not playing)"}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleScorer(n)}
                    aria-label={`Remove ${n}`}
                    className="hover:text-rose-400 px-0.5"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
            {suggestions.length > 0 && (
              <div className="mt-2">
                <p className="text-[11px] text-[var(--muted)]">From your friends</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {suggestions.map((f) => (
                    <button
                      key={`friend-${f.name}`}
                      type="button"
                      onClick={() => setScorers(t.id, [...scorers, f.name])}
                      title={f.linked ? "Linked account: matches the name on their phone" : undefined}
                      className="rounded-full border border-dashed border-[var(--border)] px-2.5 py-1 text-xs font-medium transition hover:bg-[var(--hover)]"
                    >
                      + {f.name}
                      {f.linked && <span className="ml-1 text-[10px] opacity-70">🔗 linked</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-2 flex gap-2">
              <input
                value={newScorer}
                onChange={(e) => setNewScorer(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addScorerByName())}
                placeholder="Add a scorekeeper by name…"
                className="flex-1 min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-sm"
              />
              <Button
                variant="outline"
                className="px-3 py-1.5"
                onClick={addScorerByName}
                disabled={!newScorer.trim()}
              >
                Add
              </Button>
            </div>
          </div>
        )}
      </div>
    </CollapsibleCard>
  );
}
