import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync } from "fs";
const svg = readFileSync("public/icon.svg", "utf8");
for (const [w, out] of [[512,"public/icon-512.png"],[192,"public/icon-192.png"],[180,"public/apple-touch-icon.png"]]) {
  const r = new Resvg(svg, { fitTo: { mode: "width", value: w } });
  writeFileSync(out, r.render().asPng());
  console.log("wrote", out, w+"px");
}

// Open Graph / link-preview image (1200x630)
const og = readFileSync("public/og.svg", "utf8");
const ogR = new Resvg(og, { fitTo: { mode: "width", value: 1200 }, font: { loadSystemFonts: true } });
writeFileSync("public/og.png", ogR.render().asPng());
console.log("wrote public/og.png 1200x630");

// Google Play feature graphic (1024x500)
const feat = readFileSync("public/feature.svg", "utf8");
const featR = new Resvg(feat, { fitTo: { mode: "width", value: 1024 }, font: { loadSystemFonts: true } });
writeFileSync("public/feature.png", featR.render().asPng());
console.log("wrote public/feature.png 1024x500");
