import { genSwissRound } from "../src/lib/schedule";
import { computeStandings } from "../src/lib/standings";
import { Match, Participant } from "../src/lib/types";
const P: Participant[] = Array.from({length:11},(_,i)=>({id:`p${i+1}`,name:`P${i+1}`}));
const beats=(a:string,b:string)=>Number(a.slice(1))<Number(b.slice(1));
let all:Match[]=genSwissRound(P.map(p=>p.id),[],1,4);
const play=(ms:Match[])=>ms.forEach(m=>{const aw=beats(m.sideA[0],m.sideB[0]);m.scoreA=aw?11:8;m.scoreB=aw?8:11;});
play(all);
const seen=new Set<string>();const key=(m:Match)=>[m.sideA[0],m.sideB[0]].sort().join("|");
all.forEach(m=>seen.add(key(m)));let dup=0;
for(let r=2;r<=5;r++){const ord=computeStandings(P,all,"diff").map(s=>s.participantId);const nx=genSwissRound(ord,all,r,4);nx.forEach(m=>{if(seen.has(key(m)))dup++;seen.add(key(m));});play(nx);all=[...all,...nx];}
// each round 11 players => 5 matches + 1 bye
const perRound=[1,2,3,4,5].map(r=>all.filter(m=>m.round===r).length);
// bye fairness: count games per player
const g=new Map<string,number>();all.forEach(m=>[...m.sideA,...m.sideB].forEach(id=>g.set(id,(g.get(id)??0)+1)));
const gv=[...g.values()];
console.log("matches/round:",perRound.join(","),"(expect 5 each)");
console.log("rematches:",dup);
console.log("games played range:",Math.min(...gv),"-",Math.max(...gv),"(byes spread => 4 or 5)");
console.log((perRound.every(x=>x===5)&&dup===0)?"PASS":"FAIL");
