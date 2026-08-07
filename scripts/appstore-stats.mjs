// Sporos App Store stats via the App Store Connect API + public catalog.
// Usage: node scripts/appstore-stats.mjs [YYYY-MM-DD]
// Auth: reads the Sales-and-Reports team key from ~/.appstoreconnect/private_keys.
// The IDs below are identifiers, not secrets — the .p8 private key never lives in the repo.
import { createPrivateKey, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { homedir } from "node:os";
import { join } from "node:path";

const ISSUER_ID = "e729da19-06b1-43cd-bc90-bb12391ce6b2";
const KEY_ID = "H5RJPHVRXL";
const VENDOR = "94529175";
const APP_ID = "6787539978";
const KEY_PATH = join(homedir(), ".appstoreconnect", "private_keys", `AuthKey_${KEY_ID}.p8`);

const b64url = (buf) => Buffer.from(buf).toString("base64url");

function makeJwt() {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "ES256", kid: KEY_ID, typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({ iss: ISSUER_ID, iat: now, exp: now + 900, aud: "appstoreconnect-v1" }),
  );
  const key = createPrivateKey(readFileSync(KEY_PATH, "utf8"));
  const sig = sign("sha256", Buffer.from(`${header}.${payload}`), {
    key,
    dsaEncoding: "ieee-p1363",
  });
  return `${header}.${payload}.${b64url(sig)}`;
}

// Sales reports are keyed to days in Pacific time and post the following morning.
function pacificDateDaysAgo(n) {
  const d = new Date(Date.now() - n * 86400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(d);
}

async function fetchSalesReport(jwt, date) {
  const url = new URL("https://api.appstoreconnect.apple.com/v1/salesReports");
  url.search = new URLSearchParams({
    "filter[frequency]": "DAILY",
    "filter[reportDate]": date,
    "filter[reportSubType]": "SUMMARY",
    "filter[reportType]": "SALES",
    "filter[vendorNumber]": VENDOR,
  });
  const res = await fetch(url, { headers: { Authorization: `Bearer ${jwt}` } });
  if (res.status === 404) return null; // no sales that day, or report not posted yet
  if (!res.ok) throw new Error(`salesReports ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return gunzipSync(Buffer.from(await res.arrayBuffer())).toString("utf8");
}

// Product type identifiers that mean "someone got the app" (1/1F app download,
// 1T/F1 variants) vs "existing user updated" (7/7F/7T).
function summarize(tsv) {
  const [head, ...rows] = tsv.trim().split("\n").map((l) => l.split("\t"));
  const col = (name) => head.findIndex((h) => h.trim() === name);
  const [idI, unitsI, typeI] = [col("Apple Identifier"), col("Units"), col("Product Type Identifier")];
  let downloads = 0, updates = 0, redownloads = 0, other = 0;
  for (const r of rows) {
    if (r[idI]?.trim() !== APP_ID) continue;
    const units = Number(r[unitsI] ?? 0);
    const type = (r[typeI] ?? "").trim();
    if (type.startsWith("7")) updates += units;
    else if (type.startsWith("3")) redownloads += units;
    else if (type.startsWith("1") || type.startsWith("F")) downloads += units;
    else other += units;
  }
  return { downloads, updates, redownloads, other };
}

async function publicStats() {
  try {
    const r = await fetch(`https://itunes.apple.com/lookup?id=${APP_ID}`).then((x) => x.json());
    const a = r.results?.[0];
    return a ? { rating: a.averageUserRating, ratings: a.userRatingCount } : null;
  } catch {
    return null;
  }
}

const jwt = makeJwt();
const askedDate = process.argv[2];
const dates = askedDate ? [askedDate] : [pacificDateDaysAgo(1), pacificDateDaysAgo(2)];

console.log("Sporos — App Store stats\n");
let reported = false;
for (const date of dates) {
  const tsv = await fetchSalesReport(jwt, date);
  if (tsv === null) {
    console.log(`${date}: no report available${askedDate ? "" : " (not posted yet, or zero activity)"}`);
    continue;
  }
  const { downloads, updates, redownloads, other } = summarize(tsv);
  console.log(
    `${date}: ${downloads} download(s), ${updates} update(s)` +
      `${redownloads ? `, ${redownloads} redownload(s)` : ""}${other ? `, ${other} other` : ""}`,
  );
  reported = true;
  if (!askedDate && reported) break; // most recent posted day is enough for the daily view
}

const pub = await publicStats();
if (pub) console.log(`\nRating: ${pub.rating ?? "—"}★ (${pub.ratings ?? 0} rating${pub.ratings === 1 ? "" : "s"})`);
