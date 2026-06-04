import sharp from "sharp";
import { readFileSync } from "fs";

const svg = readFileSync("public/icon.svg");
const jobs = [
  ["public/icon-192.png", 192],
  ["public/icon-512.png", 512],
  ["public/apple-touch-icon.png", 180],
];
for (const [out, size] of jobs) {
  let img = sharp(svg).resize(size, size);
  if (out.includes("apple")) img = img.flatten({ background: "#08140d" });
  await img.png().toFile(out);
  console.log("wrote", out, size);
}
