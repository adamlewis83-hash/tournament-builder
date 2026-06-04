import { defaultGolf, computeBbb, computeWolf } from "../src/lib/golf";
import { Tournament } from "../src/lib/types";
const parts = ["p1","p2","p3","p4"].map((id)=>({id,name:id}));
const golf = defaultGolf(18, parts.map(p=>p.id));
const t = { participants: parts, golf } as unknown as Tournament;

// BBB hole 0: bingo p1, bango p2, bongo p1
golf.bbb!.bingo[0]="p1"; golf.bbb!.bango[0]="p2"; golf.bbb!.bongo[0]="p1";
const bbb = computeBbb(t);
console.log("BBB:", bbb.map(r=>`${r.name}:${r.points}[${r.detail}]`).join(" "));
const bbbOk = bbb.find(r=>r.name==="p1")!.points===2 && bbb.find(r=>r.name==="p2")!.points===1;

// Wolf hole 0: wolf=p1, partner p2, scores 4,5,6,7 -> team win, p1&p2 +1
golf.scores["p1"][0]=4; golf.scores["p2"][0]=5; golf.scores["p3"][0]=6; golf.scores["p4"][0]=7;
golf.wolf!.partner[0]="p2";
// Wolf hole 1: wolf=p2, lone, scores p2=3 others 5,6,7 -> p2 +3
golf.scores["p1"][1]=5; golf.scores["p2"][1]=3; golf.scores["p3"][1]=6; golf.scores["p4"][1]=7;
golf.wolf!.partner[1]="lone";
const wolf = computeWolf(t);
console.log("WOLF:", wolf.map(r=>`${r.name}:${r.points}`).join(" "));
// expect p1: +1 (h0 team win), p2: +1 (h0) +3 (h1 lone win) = 4
const wolfOk = wolf.find(r=>r.name==="p2")!.points===4 && wolf.find(r=>r.name==="p1")!.points===1
  && wolf.find(r=>r.name==="p3")!.points===0;
console.log((bbbOk&&wolfOk)?"PASS":"FAIL");
process.exit((bbbOk&&wolfOk)?0:1);
