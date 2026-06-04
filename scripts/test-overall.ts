import { defaultGolf, computeMixedOverall } from "../src/lib/golf";
import { Tournament, GolfSegment } from "../src/lib/types";
const parts = [{id:"p1",name:"P1",handicap:0},{id:"p2",name:"P2",handicap:0}];
const golf = defaultGolf(18, ["p1","p2"]);
const segs: GolfSegment[] = [{from:1,to:6,format:"stroke"},{from:7,to:12,format:"stableford"},{from:13,to:18,format:"bingo"}];
const t = { participants: parts, golf } as unknown as Tournament;
// Segment 1 (stroke 1-6): p1 pars, p2 +1 each -> p1 wins (lower net)
for (let h=0;h<6;h++){ golf.scores["p1"][h]=golf.pars[h]; golf.scores["p2"][h]=golf.pars[h]+1; }
// Segment 2 (stableford 7-12): p2 pars (2pts each), p1 triple bogey (0) -> p2 wins
for (let h=6;h<12;h++){ golf.scores["p1"][h]=golf.pars[h]+3; golf.scores["p2"][h]=golf.pars[h]; }
// Segment 3 (bingo 13-18): tie - p1 gets 1 award, p2 gets 1 award -> split 0.5 each
golf.bbb!.bingo[12]="p1"; golf.bbb!.bango[12]="p2";
const o = computeMixedOverall(t, segs);
console.log(o.map(r=>`${r.name}:${r.points}`).join(" "));
// p1: seg1 win(1) + seg3 half(0.5) = 1.5 ; p2: seg2 win(1) + seg3 half(0.5) = 1.5 -> tie 1.5 each
const ok = o.find(r=>r.name==="P1")!.points===1.5 && o.find(r=>r.name==="P2")!.points===1.5;
console.log(ok?"PASS":"FAIL");
process.exit(ok?0:1);
