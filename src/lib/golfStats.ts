// "Derive, don't ask" — the stat engine behind the three-tap hole entry.
//
// A player enters score, putts, and tee-shot result. Everything Grint and
// 18Birdies make you tap for is computed here instead:
//   GIR         (score − putts) ≤ (par − 2)
//   approach    shots it took to reach the green = score − putts
//   up & down   missed the green, needed at most one putt
//   scramble    missed the green, still walked off at par or better
//   sand save   flagged a greenside bunker, still made par or better
//   trouble     penalty strokes recorded on the hole (water + OB)
// Anything that can't be derived from what was actually entered is null —
// never guessed, never counted against the player.

import { HoleEntry } from "./types";

export interface DerivedHole {
  gir: boolean | null;
  approach: number | null; // shots to reach the green
  upAndDown: boolean | null; // null when the green was hit (no up&down to attempt)
  scramble: boolean | null; // null when the green was hit
  sandSave: boolean | null; // null unless a greenside bunker was flagged
  penalties: number; // penalty strokes recorded on the hole (water + OB)
}

/** Penalty strokes recorded on a hole. Nothing flagged means nothing counted. */
export const penaltyStrokes = (e: HoleEntry | null | undefined): number =>
  Math.max(0, e?.water ?? 0) + Math.max(0, e?.ob ?? 0);

export function deriveHole(
  par: number,
  score: number | null,
  e: HoleEntry | null | undefined,
): DerivedHole {
  const putts = e?.putts ?? null;
  const sandSave = e?.bunker && score != null ? score <= par : null;
  const penalties = penaltyStrokes(e);
  if (score == null || putts == null) {
    return { gir: null, approach: null, upAndDown: null, scramble: null, sandSave, penalties };
  }
  const approach = score - putts;
  const gir = approach <= par - 2;
  return {
    gir,
    approach,
    upAndDown: gir ? null : putts <= 1,
    scramble: gir ? null : score <= par,
    sandSave,
    penalties,
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
  // Trouble: penalty strokes recorded, the holes they landed on, and the holes
  // with a score to measure them against (the per-18 denominator).
  penalties: { strokes: number; water: number; ob: number; holes: number; scored: number };
  fairwayBunkers: number; // holes that found a fairway/waste bunker
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
    penalties: { strokes: 0, water: 0, ob: 0, holes: 0, scored: 0 },
    fairwayBunkers: 0,
  };
  for (let h = 0; h < pars.length; h++) {
    const e = entries?.[h] ?? null;
    const score = scores[h] ?? null;
    // Fairways only exist off a full tee shot — par 3s don't count either way.
    if (e?.tee && pars[h] >= 4) {
      out.fairways.opps++;
      if (e.tee === "F") out.fairways.hit++;
    }
    if (e?.fairwayBunker) out.fairwayBunkers++;
    // Trouble is measured over holes that were actually played.
    if (score != null) {
      out.penalties.scored++;
      const water = Math.max(0, e?.water ?? 0);
      const ob = Math.max(0, e?.ob ?? 0);
      out.penalties.water += water;
      out.penalties.ob += ob;
      out.penalties.strokes += water + ob;
      if (water + ob > 0) out.penalties.holes++;
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

/** Fieldwise sum of several rounds' stats, for career/trend aggregates. */
export function sumStats(list: RoundStats[]): RoundStats {
  return list.reduce(
    (a, b) => ({
      holesEntered: a.holesEntered + b.holesEntered,
      fairways: { hit: a.fairways.hit + b.fairways.hit, opps: a.fairways.opps + b.fairways.opps },
      gir: { hit: a.gir.hit + b.gir.hit, opps: a.gir.opps + b.gir.opps },
      putts: { total: a.putts.total + b.putts.total, holes: a.putts.holes + b.putts.holes },
      upDown: { made: a.upDown.made + b.upDown.made, opps: a.upDown.opps + b.upDown.opps },
      scramble: { made: a.scramble.made + b.scramble.made, opps: a.scramble.opps + b.scramble.opps },
      sandSave: { made: a.sandSave.made + b.sandSave.made, opps: a.sandSave.opps + b.sandSave.opps },
      penalties: {
        strokes: a.penalties.strokes + b.penalties.strokes,
        water: a.penalties.water + b.penalties.water,
        ob: a.penalties.ob + b.penalties.ob,
        holes: a.penalties.holes + b.penalties.holes,
        scored: a.penalties.scored + b.penalties.scored,
      },
      fairwayBunkers: a.fairwayBunkers + b.fairwayBunkers,
    }),
    {
      holesEntered: 0,
      fairways: { hit: 0, opps: 0 },
      gir: { hit: 0, opps: 0 },
      putts: { total: 0, holes: 0 },
      upDown: { made: 0, opps: 0 },
      scramble: { made: 0, opps: 0 },
      sandSave: { made: 0, opps: 0 },
      penalties: { strokes: 0, water: 0, ob: 0, holes: 0, scored: 0 },
      fairwayBunkers: 0,
    },
  );
}

// ---- 7e: game-metric bars with traffic-light coloring ----------------------

export type Light = "good" | "ok" | "poor";

export interface GameMetric {
  key: "fairways" | "gir" | "updown" | "putts" | "penalties";
  label: string;
  value: string; // display value ("48%" or "1.92/hole")
  barPct: number; // 0–100 bar fill
  light: Light;
}

/**
 * The game metrics, thresholds calibrated to recreational golf (a mid-handicap
 * hits ~45% fairways, ~30% GIR, saves ~25% of misses, two-putts on pace, and
 * gives away a couple of penalty strokes a round). A metric only appears once
 * it has enough opportunities to mean something.
 */
export function gameMetrics(s: RoundStats): GameMetric[] {
  const out: GameMetric[] = [];
  const pct = (hit: number, opps: number) => (100 * hit) / opps;
  if (s.fairways.opps >= 5) {
    const v = pct(s.fairways.hit, s.fairways.opps);
    out.push({
      key: "fairways",
      label: "Fairways",
      value: `${Math.round(v)}%`,
      barPct: v,
      light: v >= 55 ? "good" : v >= 35 ? "ok" : "poor",
    });
  }
  if (s.gir.opps >= 5) {
    const v = pct(s.gir.hit, s.gir.opps);
    out.push({
      key: "gir",
      label: "GIR",
      value: `${Math.round(v)}%`,
      barPct: v,
      light: v >= 40 ? "good" : v >= 22 ? "ok" : "poor",
    });
  }
  if (s.upDown.opps >= 3) {
    const v = pct(s.upDown.made, s.upDown.opps);
    out.push({
      key: "updown",
      label: "Up & down",
      value: `${Math.round(v)}%`,
      barPct: v,
      light: v >= 40 ? "good" : v >= 20 ? "ok" : "poor",
    });
  }
  if (s.putts.holes >= 9) {
    const v = s.putts.total / s.putts.holes;
    out.push({
      key: "putts",
      label: "Putts/hole",
      value: `${v.toFixed(2)}`,
      // Lower is better — map 2.4/hole (rough) … 1.4/hole (tour-ish) onto the bar.
      barPct: Math.max(0, Math.min(100, ((2.4 - v) / 1.0) * 100)),
      light: v <= 1.8 ? "good" : v <= 2.05 ? "ok" : "poor",
    });
  }
  // Trouble, normalized per 18 holes so a nine and an eighteen compare. Only
  // counts holes that were played, and only for a card that is being kept: on a
  // score-only round the absence of a penalty flag proves nothing, so no metric
  // appears. Once the taps are coming in, no flag genuinely means a clean card.
  if (s.penalties.scored >= 9 && (s.holesEntered >= 9 || s.penalties.strokes > 0)) {
    const v = (18 * s.penalties.strokes) / s.penalties.scored;
    out.push({
      key: "penalties",
      label: "Penalties/18",
      value: v.toFixed(1),
      // Lower is better — 0 fills the bar, 6+ per round empties it.
      barPct: Math.max(0, Math.min(100, ((6 - v) / 6) * 100)),
      light: v <= 1 ? "good" : v <= 3 ? "ok" : "poor",
    });
  }
  return out;
}

const TAKEAWAYS: Record<GameMetric["key"], (m: GameMetric) => string> = {
  gir: (m) => `Approach play is the lever — ${m.value} greens in regulation. Aim at centers, not pins.`,
  putts: (m) => `The flat stick is the lever — ${m.value} putts per hole. Lag speed first, line second.`,
  fairways: (m) => `Biggest gain is off the tee — ${m.value} fairways. The most controlled club you own is worth strokes.`,
  updown: (m) => `Short game pays fastest — you save par ${m.value} of the time you miss a green.`,
  penalties: (m) => `Trouble is the leak — ${m.value} penalty strokes per 18. Club down and take the safe side.`,
};

/** One actionable line: the worst traffic light wins (ties break toward the
 *  stats that move scores most). All green → say so. No metrics → null. */
export function gameTakeaway(metrics: GameMetric[]): string | null {
  if (!metrics.length) return null;
  const rank: Record<Light, number> = { poor: 2, ok: 1, good: 0 };
  // Penalty strokes come first when they are bad: nothing else on this list
  // costs a card as fast as reloading off the tee.
  const priority: GameMetric["key"][] = ["penalties", "gir", "putts", "fairways", "updown"];
  const worst = [...metrics].sort(
    (a, b) => rank[b.light] - rank[a.light] || priority.indexOf(a.key) - priority.indexOf(b.key),
  )[0];
  if (rank[worst.light] === 0) return "No glaring leak — keep stacking rounds and let the index fall.";
  return TAKEAWAYS[worst.key](worst);
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

  // Trouble — penalty strokes are the loudest, most fixable number on a card.
  if (s.penalties.strokes > 0) {
    const bits: string[] = [];
    if (s.penalties.water > 0) bits.push(`${s.penalties.water} in water`);
    if (s.penalties.ob > 0) bits.push(`${s.penalties.ob} out of bounds`);
    out.push(
      `Trouble cost you ${s.penalties.strokes} penalty stroke${plural(s.penalties.strokes)} across ` +
        `${s.penalties.holes} hole${plural(s.penalties.holes)}` +
        (bits.length ? ` — ${bits.join(", ")}.` : "."),
    );
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
  // Trouble stands on its own — flagged water or OB reads back straight away,
  // whether or not the putts that finish the hole have been entered yet.
  const trouble: string[] = [];
  const water = Math.max(0, e?.water ?? 0);
  const ob = Math.max(0, e?.ob ?? 0);
  if (water > 0) trouble.push(`${water > 1 ? `${water} × ` : ""}water`);
  if (ob > 0) trouble.push(`${ob > 1 ? `${ob} × ` : ""}OB`);
  if (e?.fairwayBunker) trouble.push("fairway bunker");
  if (d.gir == null) {
    if (!trouble.length) return null;
    const cost = d.penalties > 0 ? [`+${d.penalties} penalty`] : [];
    return cost.concat(trouble).join(" · ");
  }
  const putts = e!.putts!;
  const puttWord = `${putts}-putt`;
  const bits = d.gir ? ["GIR ✓", puttWord] : ["Missed green", puttWord];
  if (!d.gir) {
    if (d.sandSave) bits.push("sand save ✓");
    else if (d.upAndDown && d.scramble) bits.push("up & down ✓");
    else if (d.scramble) bits.push("scrambled ✓");
  }
  return bits.concat(trouble).join(" · ");
}
