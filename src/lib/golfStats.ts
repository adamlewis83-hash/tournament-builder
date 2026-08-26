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
