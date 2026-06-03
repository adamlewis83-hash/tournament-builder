import { genRyder, ryderScore } from "../src/lib/ryder";
import { Participant } from "../src/lib/types";
const ps: Participant[] = [
  {id:"a1",name:"A1",team:0},{id:"a2",name:"A2",team:0},
  {id:"b1",name:"B1",team:1},{id:"b2",name:"B2",team:1},
];
const m = genRyder(ps);
console.log("matches:", m.map(x=>`${x.label}:${x.sideA.join("+")} vs ${x.sideB.join("+")}`).join(" | "));
console.log("expect 1 Fourball + 2 Singles =", m.length);
// A wins fourball, split singles
m[0].scoreA=3;m[0].scoreB=1;     // A point
m[1].scoreA=2;m[1].scoreB=2;     // halve
m[2].scoreA=1;m[2].scoreB=4;     // B point
const s = ryderScore(m);
console.log(`score A=${s.a} B=${s.b} clinch=${s.clinch} status=${s.status}`);
const ok = m.length===3 && s.a===1.5 && s.b===1.5 && s.status==="tie";
console.log(ok?"PASS":"FAIL");
process.exit(ok?0:1);
