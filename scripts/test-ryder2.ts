import { genRyder } from "../src/lib/ryder";
import { Participant } from "../src/lib/types";
const ps: Participant[] = [
  {id:"a1",name:"A1",team:0},{id:"a2",name:"A2",team:0},
  {id:"b1",name:"B1",team:1},{id:"b2",name:"B2",team:1},
];
const m = genRyder(ps, { foursomes: 1, fourball: 1, singles: 1 });
const byLabel: Record<string,number> = {};
m.forEach(x => byLabel[x.label!] = (byLabel[x.label!]||0)+1);
console.log("matches by session:", JSON.stringify(byLabel));
const rounds = Array.from(new Set(m.map(x=>x.round))).sort((a,b)=>a-b);
console.log("rounds:", rounds.join(","));
// expect Foursomes:1, Fourball:1, Singles:2, rounds 1,2,3
const ok = byLabel["Foursomes"]===1 && byLabel["Fourball"]===1 && byLabel["Singles"]===2 && rounds.length===3;
console.log(ok?"PASS":"FAIL");
process.exit(ok?0:1);
