import { defaultGolf, computeGolf, computeBbb } from "../src/lib/golf";
import { Tournament } from "../src/lib/types";
const parts = [{id:"p1",name:"P1",handicap:0},{id:"p2",name:"P2",handicap:0}];
const golf = defaultGolf(18, ["p1","p2"]);
const t = { participants: parts, golf } as unknown as Tournament;

// p1 pars holes 1-6 (idx 0-5)
for (let h=0; h<6; h++) golf.scores["p1"][h] = golf.pars[h];

// stroke segment 1-6
const stroke16 = computeGolf(t, "stroke", { from: 1, to: 6 });
const p1 = stroke16.find(r=>r.participantId==="p1")!;
console.log(`stroke 1-6: p1 thru=${p1.thru} toPar=${p1.toPar} (expect thru 6, toPar 0)`);
const strokeOk = p1.thru===6 && p1.toPar===0;

// bingo awards: hole 1 (idx0, OUT of 13-18) and hole 13 (idx12, IN)
golf.bbb!.bingo[0]="p1";
golf.bbb!.bingo[12]="p1";
const bingoSeg = computeBbb(t, { from: 13, to: 18 });
const all = computeBbb(t);
const segPts = bingoSeg.find(r=>r.participantId==="p1")!.points;
const allPts = all.find(r=>r.participantId==="p1")!.points;
console.log(`bingo 13-18: p1=${segPts} (expect 1) · all holes: p1=${allPts} (expect 2)`);
const bingoOk = segPts===1 && allPts===2;
console.log((strokeOk&&bingoOk)?"PASS":"FAIL");
process.exit((strokeOk&&bingoOk)?0:1);
