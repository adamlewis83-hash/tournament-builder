import { genKotcNext } from "../src/lib/schedule";
import { Match } from "../src/lib/types";
const ids=["p1","p2","p3","p4"];
const beats=(a:string,b:string)=>Number(a.slice(1))<Number(b.slice(1));
let all:Match[]=[]; let g=genKotcNext(ids,all,1)!; all.push(g);
const seq:string[]=[];
for(let i=0;i<8;i++){
  const cur=all[all.length-1];
  seq.push(`${cur.sideA[0]}v${cur.sideB[0]}`);
  const aw=beats(cur.sideA[0],cur.sideB[0]); cur.scoreA=aw?11:7; cur.scoreB=aw?7:11;
  const nx=genKotcNext(ids,all); if(nx) all.push(nx);
}
console.log("game sequence:", seq.join(" -> "));
// winner of each game should be on court next game (winner stays)
let ok=true;
for(let i=1;i<all.length;i++){
  const prev=all[i-1]; const aw=(prev.scoreA as number)>(prev.scoreB as number);
  const winner=aw?prev.sideA[0]:prev.sideB[0];
  const cur=all[i];
  if(cur.sideA[0]!==winner && cur.sideB[0]!==winner){ ok=false; console.log("winner-stays violated at game",i+1); }
}
console.log(ok?"PASS winner-stays":"FAIL");
process.exit(ok?0:1);
