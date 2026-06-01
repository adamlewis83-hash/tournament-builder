import { genSingleElim, genDoubleElim } from "../src/lib/bracket";
import { Match } from "../src/lib/types";

// Simulate: lower-index (better) seed always wins. Returns champion id or throws.
function simulate(matches: Match[], finalPhase: "winners" | "final"): { champ: string; played: number } {
  const byId = new Map(matches.map((m) => [m.id, m]));
  const beats = (a: string, b: string) => Number(a.split("-")[1]) < Number(b.split("-")[1]);
  let played = 0;
  let progress = true;
  let guard = 0;
  while (progress) {
    progress = false;
    guard++;
    if (guard > 1000) throw new Error("infinite loop");
    for (const m of matches) {
      if (m.scoreA !== null || m.scoreB !== null) continue;
      // skip bye/placeholder matches that will never get two real sides? require both sides filled
      if (m.sideA.length === 0 || m.sideB.length === 0) continue;
      const aWins = beats(m.sideA[0], m.sideB[0]);
      m.scoreA = aWins ? 11 : 5;
      m.scoreB = aWins ? 5 : 11;
      played++;
      progress = true;
      const winner = aWins ? m.sideA : m.sideB;
      const loser = aWins ? m.sideB : m.sideA;
      if (m.nextMatchId) {
        const n = byId.get(m.nextMatchId)!;
        if (m.nextSlot === "A") n.sideA = [...winner];
        else n.sideB = [...winner];
      }
      if (m.loserNextMatchId) {
        const n = byId.get(m.loserNextMatchId)!;
        if (m.loserNextSlot === "A") n.sideA = [...loser];
        else n.sideB = [...loser];
      }
    }
  }
  // champion = winner of the last final-phase match
  const finals = matches.filter((m) => m.phase === finalPhase);
  const decisive = finals[finals.length - 1];
  const champ = (decisive.scoreA ?? 0) > (decisive.scoreB ?? 0) ? decisive.sideA[0] : decisive.sideB[0];
  return { champ, played };
}

function check(label: string, n: number, gen: (ids: string[]) => Match[], finalPhase: "winners" | "final") {
  const ids = Array.from({ length: n }, (_, i) => `p-${i + 1}`);
  const matches = gen(ids);
  // structural checks: every non-seed match slot is fed
  const fedSlots = new Set<string>();
  for (const m of matches) {
    if (m.nextMatchId) fedSlots.add(m.nextMatchId + ":" + m.nextSlot);
    if (m.loserNextMatchId) fedSlots.add(m.loserNextMatchId + ":" + m.loserNextSlot);
  }
  const { champ, played } = simulate(matches, finalPhase);
  // top seed (p-1) should win when better seed always wins
  const ok = champ === "p-1";
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${label} n=${n}: matches=${matches.length} played=${played} champ=${champ}`,
  );
  if (!ok) throw new Error(`${label} n=${n} expected p-1, got ${champ}`);
}

console.log("=== Single elimination ===");
for (const n of [2, 3, 4, 5, 6, 8, 11, 12, 16]) check("single", n, (ids) => genSingleElim(ids), "winners");

console.log("=== Double elimination ===");
for (const n of [2, 4, 5, 8, 12, 16]) check("double", n, (ids) => genDoubleElim(ids), "final");

console.log("All bracket simulations passed.");
