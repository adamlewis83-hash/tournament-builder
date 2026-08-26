// "Derive, don't ask" — the stat engine behind the three-tap hole entry.
//
// A player enters score, putts, and tee-shot result. Everything Grint and
// 18Birdies make you tap for is computed here instead:
//   GIR         (score − putts) ≤ (par − 2)
//   approach    shots it took to reach the green = score − putts
//   up & down   missed the green, needed at most one putt
//   scramble    missed the green, still walked off at par or better
//   sand save   flagged a greenside bunker, still made par or better
// Anything that can't be derived from what was actually entered is null —
// never guessed, never counted against the player.

import { HoleEntry } from "./types";

export interface DerivedHole {
  gir: boolean | null;
  approach: number | null; // shots to reach the green
  upAndDown: boolean | null; // null when the green was hit (no up&down to attempt)
  scramble: boolean | null; // null when the green was hit
  sandSave: boolean | null; // null unless a bunker was flagged
}

export function deriveHole(
  par: number,
  score: number | null,
  e: HoleEntry | null | undefined,
): DerivedHole {
  const putts = e?.putts ?? null;
  const sandSave = e?.bunker && score != null ? score <= par : null;
  if (score == null || putts == null) {
    return { gir: null, approach: null, upAndDown: null, scramble: null, sandSave };
  }
  const approach = score - putts;
  const gir = approach <= par - 2;
  return {
    gir,
    approach,
    upAndDown: gir ? null : putts <= 1,
    scramble: gir ? null : score <= par,
    sandSave,
  };
}

export interface RoundStats {
  holesEntered: number; // holes with both score and putts
  fairways: { hit: number; opps: number }; // tee result entered on par-4s/5s
  gir: { hit: number; opps: number };
  putts: { total: number; holes: number };
  upDown: { made: number; opps: number };
  scramble: { made: number; opps: number };
  sandSave: { made: number; opps: number };
}

/** Aggregate a round's derived stats. Holes only count toward a stat when the
 *  taps that drive it were actually entered — partial rounds stay honest. */
export function roundStats(
  pars: number[],
  scores: (number | null)[],
  entries: (HoleEntry | null)[] | undefined,
): RoundStats {
  const out: RoundStats = {
    holesEntered: 0,
    fairways: { hit: 0, opps: 0 },
    gir: { hit: 0, opps: 0 },
    putts: { total: 0, holes: 0 },
    upDown: { made: 0, opps: 0 },
    scramble: { made: 0, opps: 0 },
    sandSave: { made: 0, opps: 0 },
  };
  for (let h = 0; h < pars.length; h++) {
    const e = entries?.[h] ?? null;
    const score = scores[h] ?? null;
    // Fairways only exist off a full tee shot — par 3s don't count either way.
    if (e?.tee && pars[h] >= 4) {
      out.fairways.opps++;
      if (e.tee === "F") out.fairways.hit++;
    }
    const d = deriveHole(pars[h], score, e);
    if (d.gir != null) {
      out.holesEntered++;
      out.gir.opps++;
      if (d.gir) out.gir.hit++;
      out.putts.total += e!.putts!;
      out.putts.holes++;
    }
    if (d.upAndDown != null) {
      out.upDown.opps++;
      if (d.upAndDown) out.upDown.made++;
    }
    if (d.scramble != null) {
      out.scramble.opps++;
      if (d.scramble) out.scramble.made++;
    }
    if (d.sandSave != null) {
      out.sandSave.opps++;
      if (d.sandSave) out.sandSave.made++;
    }
  }
  return out;
}

/**
 * Written insight cards for the post-round summary (7d) — two to four plain
 * sentences generated from the round's derived stats, most actionable first.
 * Every insight names its evidence; nothing is asserted that the taps can't
 * back up, so a score-only round simply gets fewer (or zero) cards.
 */
export function roundInsights(
  pars: number[],
  scores: (number | null)[],
  entries: (HoleEntry | null)[] | undefined,
): string[] {
  const s = roundStats(pars, scores, entries);
  const out: string[] = [];
  const plural = (n: number) => (n === 1 ? "" : "s");

  // Putting — measured against two-putt pace.
  if (s.putts.holes >= 6) {
    const excess = s.putts.total - 2 * s.putts.holes;
    let threePutts = 0;
    for (let h = 0; h < pars.length; h++) {
      const p = entries?.[h]?.putts;
      if (p != null && p >= 3 && scores[h] != null) threePutts++;
    }
    if (excess > 0) {
      out.push(
        `Putting cost you ${excess} shot${plural(excess)} — ${s.putts.total} putts over ${s.putts.holes} holes` +
          (threePutts > 0 ? `, including ${threePutts} three-putt${plural(threePutts)}.` : "."),
      );
    } else {
      out.push(
        `The flat stick showed up — ${s.putts.total} putts (${(s.putts.total / s.putts.holes).toFixed(1)} per hole)` +
          (threePutts === 0 ? " and not a single three-putt." : "."),
      );
    }
  }

  // Tee shots — a directional lean is the most fixable miss there is.
  {
    let L = 0;
    let R = 0;
    for (let h = 0; h < pars.length; h++) {
      const e = entries?.[h];
      if (!e?.tee || pars[h] < 4) continue;
      if (e.tee === "L") L++;
      if (e.tee === "R") R++;
    }
    const miss = L + R;
    if (miss >= 3 && Math.max(L, R) / miss >= 0.7) {
      const side = L > R ? "left" : "right";
      out.push(
        `Your tee misses lean ${side} — ${Math.max(L, R)} of ${miss} missed fairways went ${side}. One swing thought fixes a pattern.`,
      );
    }
  }

  // Greens decide scores — average vs par split by GIR.
  {
    let girN = 0;
    let girSum = 0;
    let missN = 0;
    let missSum = 0;
    for (let h = 0; h < pars.length; h++) {
      const d = deriveHole(pars[h], scores[h] ?? null, entries?.[h] ?? null);
      if (d.gir == null) continue;
      const rel = (scores[h] as number) - pars[h];
      if (d.gir) {
        girN++;
        girSum += rel;
      } else {
        missN++;
        missSum += rel;
      }
    }
    if (girN >= 2 && missN >= 2) {
      const fmt = (v: number) => (v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1));
      out.push(
        `Greens decide your score — you averaged ${fmt(girSum / girN)} on the ${girN} holes you hit in regulation vs ${fmt(missSum / missN)} on the ${missN} you missed.`,
      );
    }
  }

  // Scrambling — the short-game save rate.
  if (s.scramble.opps >= 3) {
    out.push(
      `You saved par ${s.scramble.made} of ${s.scramble.opps} times after missing a green` +
        (s.sandSave.opps > 0
          ? ` — ${s.sandSave.made} of ${s.sandSave.opps} from the sand.`
          : "."),
    );
  }

  return out.slice(0, 4);
}

/** The "AUTO" strip under the tap rows — one line naming what the taps just
 *  derived, so the player sees the payoff of entering them. Null until the
 *  hole has enough entered to derive anything. */
export function autoSummary(
  par: number,
  score: number | null,
  e: HoleEntry | null | undefined,
): string | null {
  const d = deriveHole(par, score, e);
  if (d.gir == null) return null;
  const putts = e!.putts!;
  const puttWord = `${putts}-putt`;
  if (d.gir) return `GIR ✓ · ${puttWord}`;
  const bits = [`Missed green`, puttWord];
  if (d.sandSave) bits.push("sand save ✓");
  else if (d.upAndDown && d.scramble) bits.push("up & down ✓");
  else if (d.scramble) bits.push("scrambled ✓");
  return bits.join(" · ");
}
