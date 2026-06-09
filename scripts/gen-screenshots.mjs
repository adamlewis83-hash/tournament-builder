// Generates stylized Play Store screenshots (1080x1920) — phone frame + app screen + caption.
import { Resvg } from "@resvg/resvg-js";
import { writeFileSync } from "fs";

const W = 1080, H = 1920;
const F = `font-family="Segoe UI, Arial, Helvetica, sans-serif"`;
const SUB = "#64748b", FG = "#0f172a", BR = "#16a34a", BRS = "#0d8a3e";

const av = (x, y, l, c, r = 26) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/><text x="${x}" y="${y + r * 0.34}" ${F} font-size="${r * 0.95}" font-weight="700" fill="#fff" text-anchor="middle">${l}</text>`;

/* ---------- screen builders (local coords, w x h) ---------- */
function liveScreen(w, h) {
  return `
    <rect width="${w}" height="${h}" fill="#ffffff"/>
    <text x="40" y="80" ${F} font-size="30" font-weight="800" fill="#f43f5e">● LIVE</text>
    <text x="${w - 40}" y="80" ${F} font-size="28" fill="${SUB}" text-anchor="end">Court 1</text>
    <text x="40" y="150" ${F} font-size="46" font-weight="800" fill="${FG}">Pickleball Night</text>
    ${av(70, 250, "N", "#16a34a", 34)}
    <text x="120" y="262" ${F} font-size="40" font-weight="700" fill="${FG}">Net Ninjas</text>
    <text x="${w - 40}" y="266" ${F} font-size="64" font-weight="800" fill="${FG}" text-anchor="end">21</text>
    ${av(70, 350, "S", "#f43f5e", 34)}
    <text x="120" y="362" ${F} font-size="40" font-weight="700" fill="${FG}">Smash Bros</text>
    <text x="${w - 40}" y="366" ${F} font-size="64" font-weight="800" fill="${SUB}" text-anchor="end">18</text>
    <rect x="40" y="400" width="${w - 80}" height="18" rx="9" fill="#e2e8f0"/>
    <rect x="40" y="400" width="${(w - 80) * 0.62}" height="18" rx="9" fill="#16a34a"/>
    <text x="40" y="500" ${F} font-size="28" font-weight="700" fill="${SUB}">UP NEXT</text>
    ${[
      ["Dink Dynasty", "Paddle Pirates"],
      ["Court Kings", "Spin Doctors"],
      ["Lob City", "Net Gains"],
      ["Rally Cats", "Baseline Bros"],
      ["The Aces", "Dig Squad"],
    ]
      .map(
        ([a, b], i) =>
          `<rect x="40" y="${530 + i * 110}" width="${w - 80}" height="92" rx="18" fill="#f1f5f9"/>
           <text x="64" y="${590 + i * 110}" ${F} font-size="34" font-weight="600" fill="${FG}">${a}</text>
           <text x="${w - 64}" y="${590 + i * 110}" ${F} font-size="34" font-weight="600" fill="${FG}" text-anchor="end">${b}</text>`,
      )
      .join("")}`;
}

function cheerScreen(w, h) {
  const cheers = [
    ["A", "#16a34a", "Adam", "Net Ninjas take it! 🔥", "@ Cody"],
    ["G", "#a855f7", "Grandma", "Go team!! 🎉", ""],
    ["T", "#0ea5e9", "Tom", "What a rally 👏", ""],
    ["M", "#f59e0b", "Mia", "Let’s gooo 💪", "@ Hole 7"],
    ["J", "#ef4444", "Josh", "Clutch finish! 🙌", ""],
  ];
  return `
    <rect width="${w}" height="${h}" fill="#ffffff"/>
    <text x="40" y="90" ${F} font-size="46" font-weight="800" fill="${FG}">Cheers 💬</text>
    ${cheers
      .map(
        ([l, c, name, text, tag], i) =>
          `${av(72, 200 + i * 170, l, c, 34)}
           <text x="124" y="${180 + i * 170}" ${F} font-size="38" font-weight="700" fill="${FG}">${name}</text>
           ${tag ? `<rect x="${140 + name.length * 25}" y="${158 + i * 170}" width="${tag.length * 17 + 28}" height="42" rx="11" fill="#dcfce7"/><text x="${154 + name.length * 25}" y="${187 + i * 170}" ${F} font-size="26" font-weight="600" fill="${BR}">${tag}</text>` : ""}
           <text x="124" y="${228 + i * 170}" ${F} font-size="36" fill="${SUB}">${text}</text>`,
      )
      .join("")}
    <rect x="40" y="${h - 130}" width="${w - 230}" height="86" rx="20" fill="#f1f5f9"/>
    <text x="66" y="${h - 76}" ${F} font-size="34" fill="#94a3b8">Cheer them on…</text>
    <rect x="${w - 170}" y="${h - 130}" width="130" height="86" rx="20" fill="${BR}"/>
    <text x="${w - 105}" y="${h - 74}" ${F} font-size="34" font-weight="700" fill="#fff" text-anchor="middle">Send</text>`;
}

function formatScreen(w, h) {
  const rows = [
    ["1", "Net Ninjas", "3–0", "#16a34a", true],
    ["2", "Dink Dynasty", "2–1", "#0ea5e9", false],
    ["3", "Smash Bros", "1–2", "#f59e0b", false],
    ["4", "Paddle Pirates", "0–3", "#a855f7", false],
  ];
  return `
    <rect width="${w}" height="${h}" fill="#ffffff"/>
    <rect x="40" y="44" width="260" height="56" rx="28" fill="#dcfce7"/>
    <text x="170" y="82" ${F} font-size="30" font-weight="700" fill="${BR}" text-anchor="middle">Round Robin</text>
    <text x="40" y="190" ${F} font-size="46" font-weight="800" fill="${FG}">Standings</text>
    ${rows
      .map(
        ([r, name, rec, c, top], i) =>
          `<rect x="40" y="${240 + i * 120}" width="${w - 80}" height="104" rx="20" fill="${top ? "#ecfdf3" : "#f8fafc"}"/>
           <text x="78" y="${302 + i * 120}" ${F} font-size="40" font-weight="800" fill="${SUB}">${r}</text>
           ${av(150, 292 + i * 120, name[0], c, 32)}
           <text x="208" y="${304 + i * 120}" ${F} font-size="38" font-weight="700" fill="${FG}">${name}</text>
           <text x="${w - 70}" y="${304 + i * 120}" ${F} font-size="38" font-weight="700" fill="${SUB}" text-anchor="end">${rec}</text>`,
      )
      .join("")}
    <rect x="40" y="${240 + 4 * 120 + 20}" width="${w - 80}" height="96" rx="22" fill="${BR}"/>
    <text x="${w / 2}" y="${240 + 4 * 120 + 82}" ${F} font-size="38" font-weight="700" fill="#fff" text-anchor="middle">Generate bracket →</text>`;
}

function shot(file, caption, bg1, bg2, screen) {
  const pw = 660, ph = 1200, px = (W - pw) / 2, py = 470;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs><linearGradient id="bg" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <text x="${W / 2}" y="240" ${F} font-size="76" font-weight="800" fill="#f3f4e8" text-anchor="middle">${caption}</text>
    <rect x="${px - 6}" y="${py - 6}" width="${pw + 12}" height="${ph + 12}" rx="76" fill="#0b1220" opacity="0.5"/>
    <rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="70" fill="#0f172a"/>
    <svg x="${px + 18}" y="${py + 18}" width="${pw - 36}" height="${ph - 36}">
      <clipPath id="r"><rect width="${pw - 36}" height="${ph - 36}" rx="54"/></clipPath>
      <g clip-path="url(#r)">${screen(pw - 36, ph - 36)}</g>
    </svg>
    <text x="${W / 2}" y="${H - 80}" ${F} font-size="44" font-weight="700" fill="#34d399" text-anchor="middle">sporos</text>
  </svg>`;
  const r = new Resvg(svg, { font: { loadSystemFonts: true } });
  writeFileSync(`public/${file}`, r.render().asPng());
  console.log("wrote", file);
}

shot("shot-1-live.png", "Score it live, together", "#0a1410", "#10311f", liveScreen);
shot("shot-2-cheer.png", "Everyone cheers along", "#0b1220", "#10311f", cheerScreen);
shot("shot-3-standings.png", "Any sport. Any format.", "#0a1410", "#122a1c", formatScreen);
