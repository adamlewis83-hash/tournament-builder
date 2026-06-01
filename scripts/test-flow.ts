import { genDoublesRR } from "../src/lib/schedule";
import { computeStandings } from "../src/lib/standings";
import { genSingleElimSides } from "../src/lib/bracket";
import { Participant } from "../src/lib/types";

const NAMES = ["Cody","Adam","Logan","Brittany","Joe","Tyler","Ashley","Dustin","Davis","Richard","Ryan","Matt"];
const participants: Participant[] = NAMES.map((n, i) => ({ id: `p${i + 1}`, name: n }));
const ids = participants.map((p) => p.id);

const matches = genDoublesRR(ids, 4, 3);
console.log(`Doubles RR: ${matches.length} games over 4 rounds (expect 12).`);

// games per player + distinct partners
const plays = new Map<string, number>();
const partners = new Map<string, Set<string>>();
ids.forEach((id) => { plays.set(id, 0); partners.set(id, new Set()); });
for (const m of matches) {
  for (const side of [m.sideA, m.sideB]) {
    for (const id of side) plays.set(id, plays.get(id)! + 1);
    if (side.length === 2) {
      partners.get(side[0])!.add(side[1]);
      partners.get(side[1])!.add(side[0]);
    }
  }
}
let ok = true;
for (const id of ids) {
  const g = plays.get(id)!;
  const distinct = partners.get(id)!.size;
  if (g !== 4) { ok = false; console.log(`FAIL ${id} played ${g} (expect 4)`); }
  if (distinct !== 4) console.log(`note ${id} had ${distinct} distinct partners`);
}
console.log(ok ? "PASS: everyone plays exactly 4 games" : "FAIL: uneven games");

// Enter deterministic scores: lower index wins by its index-derived margin.
for (const m of matches) {
  const aStrength = m.sideA.reduce((s, id) => s + (12 - Number(id.slice(1))), 0);
  const bStrength = m.sideB.reduce((s, id) => s + (12 - Number(id.slice(1))), 0);
  if (aStrength >= bStrength) { m.scoreA = 11; m.scoreB = 11 - Math.max(1, Math.min(9, aStrength - bStrength)); }
  else { m.scoreB = 11; m.scoreA = 11 - Math.max(1, Math.min(9, bStrength - aStrength)); }
}

const standings = computeStandings(participants, matches);
console.log("\nStandings (top 4):");
standings.slice(0, 4).forEach((r) => console.log(`  #${r.rank} ${r.name}  W${r.wins} L${r.losses} diff ${r.diff > 0 ? "+" : ""}${r.diff}`));

// Finals: pair 1&4 vs 2&3
const top = standings.slice(0, 4).map((r) => r.participantId);
const sides = [ [top[0], top[3]], [top[1], top[2]] ];
const finals = genSingleElimSides(sides, "winners");
console.log(`\nFinals match count: ${finals.length} (expect 1 game for top-4 doubles).`);
const f = finals[0];
const nm = (id: string) => participants.find((p) => p.id === id)!.name;
console.log(`  ${f.sideA.map(nm).join(" & ")}  vs  ${f.sideB.map(nm).join(" & ")}`);
const expected =
  finals.length === 1 &&
  f.sideA.length === 2 &&
  f.sideB.length === 2 &&
  f.sideA[0] === top[0] &&
  f.sideA[1] === top[3] &&
  f.sideB[0] === top[1] &&
  f.sideB[1] === top[2];
console.log(expected ? "PASS: finals = (Seed1 & Seed4) vs (Seed2 & Seed3)" : "FAIL: finals pairing wrong");
if (!ok || !expected) process.exit(1);
console.log("\nFlow test passed.");
