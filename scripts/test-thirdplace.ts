import { genSingleElim, propagateBracket } from "../src/lib/bracket";
const ids = ["p-1","p-2","p-3","p-4"];
let m = genSingleElim(ids, "winners", { thirdPlace: true });
const placement = m.filter(x => x.phase === "placement");
console.log("placement matches:", placement.length, "(expect 1)");
// play semifinals: seed1 beats seed4, seed2 beats seed3 (standard bracket: SF are round1 here for n=4)
const beats = (a:string,b:string)=>Number(a.split("-")[1])<Number(b.split("-")[1]);
for (const x of m) {
  if (x.phase==="winners" && x.round===1 && x.sideA.length && x.sideB.length) {
    const aw = beats(x.sideA[0],x.sideB[0]); x.scoreA=aw?11:5; x.scoreB=aw?5:11;
  }
}
m = propagateBracket(m);
const p = m.find(x=>x.phase==="placement")!;
const nm=(s:string[])=>s.join("");
console.log("3rd-place game sides:", nm(p.sideA), "vs", nm(p.sideB), "(expect the two SF losers: p-4 vs p-3)");
const ok = placement.length===1 && p.sideA.length===1 && p.sideB.length===1 && p.sideA[0]!==p.sideB[0];
console.log(ok ? "PASS" : "FAIL");
process.exit(ok?0:1);
