import { defaultGolf, computeGolf, holeStrokes } from "../src/lib/golf";
import { Tournament } from "../src/lib/types";

const parts = [
  { id: "a", name: "Scratch", handicap: 0 },
  { id: "b", name: "Bogey", handicap: 18 },
];
const golf = defaultGolf(18, ["a","b"]);
// Scratch shoots even par (par each hole). Bogey shoots 1 over each hole (gross 90).
golf.pars.forEach((p,h)=>{ golf.scores["a"][h]=p; golf.scores["b"][h]=p+1; });

const t = { participants: parts, golf, config:{ golfMode:"stroke" } } as unknown as Tournament;

const stroke = computeGolf(t, "stroke");
console.log("STROKE:");
stroke.forEach(r=>console.log(`  ${r.name}: gross ${r.gross} net ${r.net} toPar ${r.toPar}`));
// Scratch gross 72 net 72; Bogey gross 90 net 90-18=72 -> tie net, scratch wins gross tiebreak? both net 72, gross 72<90 => scratch first
const okStroke = stroke[0].name==="Scratch" && stroke[0].gross===72 && stroke[1].net===72;

const stab = computeGolf(t, "stableford");
console.log("STABLEFORD:");
stab.forEach(r=>console.log(`  ${r.name}: ${r.stableford} pts`));
// Scratch: par every hole => 2 pts x18 = 36. Bogey net: each hole net = (par+1) - 1 (gets a stroke every hole, hcp18) = par => 2 pts x18 = 36. Tie 36 each.
const okStab = stab[0].stableford===36 && stab[1].stableford===36;

// Skins: scratch lower every hole => wins all 18 skins
const skins = computeGolf(t, "skins");
console.log("SKINS:");
skins.forEach(r=>console.log(`  ${r.name}: ${r.skins}`));
const okSkins = skins.find(r=>r.name==="Scratch")!.skins===18 && skins.find(r=>r.name==="Bogey")!.skins===0;

console.log("hcp strokes check (hcp18, si1, 18 holes):", holeStrokes(18,1,18), "(expect 1)");
console.log((okStroke&&okStab&&okSkins)?"PASS":"FAIL");
process.exit((okStroke&&okStab&&okSkins)?0:1);
