import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync } from "fs";
const svg = readFileSync("public/icon.svg", "utf8");
for (const [w, out] of [[512,"public/icon-512.png"],[192,"public/icon-192.png"],[180,"public/apple-touch-icon.png"]]) {
  const r = new Resvg(svg, { fitTo: { mode: "width", value: w } });
  writeFileSync(out, r.render().asPng());
  console.log("wrote", out, w+"px");
}
