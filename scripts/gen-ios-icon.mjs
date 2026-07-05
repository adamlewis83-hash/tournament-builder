import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import { readFileSync, writeFileSync } from "fs";

// iOS marketing icon (1024x1024, opaque): iOS applies its own corner mask,
// so use a full-bleed background and drop the rounded border from icon.svg.
let svg = readFileSync("public/icon.svg", "utf8");
svg = svg.replace(
  '<rect width="512" height="512" rx="112" fill="#08140d"/>',
  '<rect width="512" height="512" fill="#08140d"/>'
);
svg = svg.replace(/<rect x="6" y="6"[^/]*\/>\s*/, "");

const r = new Resvg(svg, { fitTo: { mode: "width", value: 1024 } });
const out = await sharp(r.render().asPng())
  .flatten({ background: "#08140d" })
  .png()
  .toBuffer();
const meta = await sharp(out).metadata();
if (meta.hasAlpha || meta.width !== 1024) throw new Error("bad icon output");
writeFileSync(
  "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png",
  out
);
console.log("wrote ios AppIcon 1024x1024 (no alpha)");
