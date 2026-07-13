// Auto-load hole pins from OpenStreetMap course data (free, no key).
// Volunteers map courses with `golf=green` polygons (often ref-tagged with the
// hole number) and `golf=hole` lines drawn tee → pin. We turn those into a
// per-hole pin array: green centroid when a ref-matched green exists, else the
// end point of the ref-matched hole line (which by OSM convention sits on the green).

type LngLat = [number, number];

interface OverpassElement {
  type: string;
  tags?: Record<string, string>;
  center?: { lat: number; lon: number };
  geometry?: { lat: number; lon: number }[];
}

// The main Overpass instance is community-run and occasionally slow or down;
// fall through the public mirrors before giving up.
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

export async function overpassFetch(query: string): Promise<Response> {
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
      if (res.ok) return res;
      lastErr = new Error(`Overpass ${res.status}`);
    } catch (e) {
      lastErr = e;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Overpass unreachable");
}

function dist2(a: LngLat, b: LngLat): number {
  // Cheap comparator (not meters) — fine for "which candidate is closest".
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return dx * dx + dy * dy;
}

export interface OsmPinsResult {
  pins: (LngLat | null)[];
  found: number; // holes that got a pin
}

// Fetch greens + hole lines within ~1.5km of `center` and derive a pin per hole.
// `startHole` handles back-nine rounds (hole index 0 = course hole `startHole`).
export async function fetchOsmPins(
  center: LngLat,
  holes: number,
  startHole = 1,
): Promise<OsmPinsResult> {
  const [lng, lat] = center;
  const query = `[out:json][timeout:25];
(way["golf"="green"](around:1500,${lat},${lng}););out tags center;
(way["golf"="hole"](around:1500,${lat},${lng}););out tags geom;`;

  const res = await overpassFetch(query);
  const data = (await res.json()) as { elements: OverpassElement[] };

  const greens: { ref: number; center: LngLat }[] = [];
  const holeEnds: { ref: number; end: LngLat }[] = [];
  for (const el of data.elements) {
    const t = el.tags;
    if (!t) continue;
    const ref = t.ref ? parseInt(t.ref, 10) : NaN;
    if (t.golf === "green" && el.center && !Number.isNaN(ref)) {
      greens.push({ ref, center: [el.center.lon, el.center.lat] });
    } else if (t.golf === "hole" && el.geometry?.length && !Number.isNaN(ref)) {
      const last = el.geometry[el.geometry.length - 1];
      holeEnds.push({ ref, end: [last.lon, last.lat] });
    }
  }

  const pins: (LngLat | null)[] = [];
  let found = 0;
  for (let i = 0; i < holes; i++) {
    const n = startHole + i;
    // Prefer the ref-matched green centroid; if several courses overlap the
    // radius and share hole numbers, take the candidate nearest to the player.
    const g = greens
      .filter((x) => x.ref === n)
      .sort((a, b) => dist2(a.center, center) - dist2(b.center, center))[0];
    const h = holeEnds
      .filter((x) => x.ref === n)
      .sort((a, b) => dist2(a.end, center) - dist2(b.end, center))[0];
    const pin = g?.center ?? h?.end ?? null;
    if (pin) found++;
    pins.push(pin);
  }
  return { pins, found };
}
