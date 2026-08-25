import { centroidOf, metersBetween } from "./greens";

// Auto-load hole pins from OpenStreetMap course data (free, no key).
// Volunteers map courses with `golf=green` polygons (often ref-tagged with the
// hole number) and `golf=hole` lines drawn tee → pin. We turn those into a
// per-hole pin array: green centroid when a ref-matched green exists, else the
// end point of the ref-matched hole line (which by OSM convention sits on the green).

type LngLat = [number, number];

export interface OverpassElement {
  type: string;
  id: number;
  tags?: Record<string, string>;
  center?: { lat: number; lon: number };
  geometry?: { lat: number; lon: number }[];
  lat?: number; // node elements carry coords directly
  lon?: number;
}

// The main Overpass instance is community-run and occasionally slow or down;
// fall through the public mirrors before giving up.
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

// Direct Overpass access, falling through mirrors. An overloaded instance can
// answer 200 with zero elements plus a `remark` about an internal timeout —
// treat that as a failure and try the next mirror, otherwise callers would
// show a false "nothing found". Used server-side by /api/overpass.
export async function overpassDirect(query: string): Promise<{ elements: OverpassElement[] }> {
  let lastErr: unknown = null;
  for (const url of OVERPASS_ENDPOINTS) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(url, {
        method: "POST",
        body: "data=" + encodeURIComponent(query),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        signal: ctrl.signal,
      });
      if (!res.ok) {
        lastErr = new Error(`Overpass ${res.status}`);
        continue;
      }
      const data = (await res.json()) as { elements?: OverpassElement[]; remark?: string };
      if (data.remark && !(data.elements ?? []).length) {
        lastErr = new Error(`Overpass remark: ${data.remark}`);
        continue;
      }
      return { elements: data.elements ?? [] };
    } catch (e) {
      lastErr = e;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Overpass unreachable");
}

// Client entry point: route queries through our own /api/overpass proxy —
// Vercel's servers reach Overpass far more reliably than a phone on cell data
// (per-IP throttling, flaky mirrors). Falls back to direct mirrors if our API
// is unavailable (e.g. local dev without the route, offline SW edge cases).
export async function overpassJson(query: string): Promise<{ elements: OverpassElement[] }> {
  try {
    const res = await fetch("/api/overpass", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    if (res.ok) return (await res.json()) as { elements: OverpassElement[] };
  } catch {
    /* fall through to direct */
  }
  return overpassDirect(query);
}

function dist2(a: LngLat, b: LngLat): number {
  // Cheap comparator (not meters) — fine for "which candidate is closest".
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return dx * dx + dy * dy;
}

export interface OsmCourseResult {
  pins: (LngLat | null)[]; // per-hole pin guess (green centroid, else hole-line end)
  greens: (LngLat[] | null)[]; // per-hole green polygon ring, for front/center/back
  found: number; // holes that got a pin
  greensFound: number; // holes that got a full green outline
}

// Fetch greens + hole lines within ~1.5km of `center`: the full green polygon
// per hole (front/center/back needs the boundary, not just a point) plus a pin
// guess. `startHole` handles back-nine rounds (hole index 0 = hole `startHole`).
export async function fetchOsmCourse(
  center: LngLat,
  holes: number,
  startHole = 1,
): Promise<OsmCourseResult> {
  const [lng, lat] = center;
  const query = `[out:json][timeout:25];
(way["golf"="green"](around:1500,${lat},${lng}););out tags geom;
(way["golf"="hole"](around:1500,${lat},${lng}););out tags geom;`;

  const data = await overpassJson(query);

  const greenRings: { ref: number; ring: LngLat[]; center: LngLat }[] = [];
  const holeEnds: { ref: number; end: LngLat }[] = [];
  for (const el of data.elements) {
    const t = el.tags;
    if (!t || !el.geometry?.length) continue;
    const ref = t.ref ? parseInt(t.ref, 10) : NaN;
    if (t.golf === "green") {
      // Keep ref-less greens too — many courses (St Andrews included) number
      // only their hole lines, so greens get their number associated below.
      const ring: LngLat[] = el.geometry.map((g) => [g.lon, g.lat]);
      greenRings.push({ ref, ring, center: centroidOf(ring) });
    } else if (t.golf === "hole" && !Number.isNaN(ref)) {
      const last = el.geometry[el.geometry.length - 1];
      holeEnds.push({ ref, end: [last.lon, last.lat] });
    }
  }


  const pins: (LngLat | null)[] = [];
  const greens: (LngLat[] | null)[] = [];
  let found = 0;
  let greensFound = 0;
  for (let i = 0; i < holes; i++) {
    const n = startHole + i;
    // Prefer the ref-matched green; if several courses overlap the radius and
    // share hole numbers, take the candidate nearest to the player.
    let g = greenRings
      .filter((x) => x.ref === n)
      .sort((a, b) => dist2(a.center, center) - dist2(b.center, center))[0];
    const h = holeEnds
      .filter((x) => x.ref === n)
      .sort((a, b) => dist2(a.end, center) - dist2(b.end, center))[0];
    // Ref-less greens (St Andrews numbers only its hole lines) resolve through
    // the hole line: golf=hole is drawn tee → pin and ends on its green, so the
    // nearest green to the line's end is this hole's — resolved per hole, which
    // also lets two holes share one double green.
    if (!g && h) {
      g = greenRings
        .filter((x) => metersBetween(x.center, h.end) < 80)
        .sort((a, b) => dist2(a.center, h.end) - dist2(b.center, h.end))[0];
    }
    const pin = g?.center ?? h?.end ?? null;
    if (pin) found++;
    if (g) greensFound++;
    pins.push(pin);
    greens.push(g?.ring ?? null);
  }
  return { pins, greens, found, greensFound };
}

export interface OsmPinsResult {
  pins: (LngLat | null)[];
  found: number;
}

/** Pin-only view of fetchOsmCourse, kept for callers that don't need outlines. */
export async function fetchOsmPins(
  center: LngLat,
  holes: number,
  startHole = 1,
): Promise<OsmPinsResult> {
  const { pins, found } = await fetchOsmCourse(center, holes, startHole);
  return { pins, found };
}
