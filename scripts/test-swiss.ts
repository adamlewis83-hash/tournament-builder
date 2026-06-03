import { genSwissRound } from "../src/lib/schedule";
import { computeStandings } from "../src/lib/standings";
import { Match, Participant } from "../src/lib/types";

const P: Participant[] = ["A","B","C","D","E","F"].map((n,i)=>({id:`p${i+1}`,name:n}));
const ids = P.map(p=>p.id);
const beats=(a:string,b:string)=>Number(a.slice(1))<Number(b.slice(1));
let all: Match[] = genSwissRound(ids, [], 1, 3);
function play(ms:Match[]){for(const m of ms){const aw=beats(m.sideA[0],m.sideB[0]);m.scoreA=aw?11:7;m.scoreB=aw?7:11;}}
play(all);
const seen = new Set<string>();
let dup=0, rounds=4;
const key=(m:Match)=>[m.sideA[0],m.sideB[0]].sort().join("|");
all.forEach(m=>seen.add(key(m)));
for(let r=2;r<=rounds;r++){
  const ordered=computeStandings(P,all,"diff").map(s=>s.participantId);
  const next=genSwissRound(ordered, all, r, 3);
  for(const m of next){ if(seen.has(key(m))) dup++; seen.add(key(m)); }
  play(next);
  all=[...all,...next];
}
const perRound = [1,2,3,4].map(r=>all.filter(m=>m.round===r).length);
console.log("matches per round:", perRound.join(","), "(expect 3,3,3,3 for 6 players)");
console.log("rematches across 4 rounds:", dup);
const final = computeStandings(P,all,"diff");
console.log("leader:", final[0].name, `${final[0].wins}-${final[0].losses}`);
const ok = perRound.every(x=>x===3) && dup===0;
console.log(ok?"PASS":"FAIL");
process.exit(ok?0:1);
