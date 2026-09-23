// Disc golf course details from OpenStreetMap. Mapped courses carry per-hole
// nodes — `disc_golf=tee` and `disc_golf=basket` with `ref` (hole number) and
// often `par` — which is everything a scorecard needs: hole count, pars, and
// basket positions for a distance-to-basket readout (the disc version of the
// golf GPS band). Coverage varies: a course with no per-hole nodes still sets
// up fine with the disc-golf default of par 3s.
import { overpassJson, type OverpassElement } from "./osmGolf";
import type { LngLat } from "./greens";

export interface DiscCourseDetail {
  holes: number;
  pars: number[];
  /** Basket position per hole (0-based), null where OSM has none. */
  pins: (LngLat | null)[];
  /** How many holes actually had OSM tee/basket nodes — 0 means defaults only. */
  mappedHoles: number;
}

const holeRef = (tags: Record<string, string> | undefined): number | null => {
  const raw = tags?.ref ?? tags?.["ref:hole"] ?? tags?.hole;
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isInteger(n) && n >= 1 && n <= 36 ? n : null;
};

/** Pure parse, exported for tests — elements in, scorecard out. */
export function parseDiscCourse(
  elements: OverpassElement[],
  fallbackHoles: number | null = null,
): DiscCourseDetail {
  const parByHole = new Map<number, number>();
  const basketByHole = new Map<number, LngLat>();
  let maxRef = 0;
  let teeCount = 0;
  let basketCount = 0;

  for (const el of elements) {
    const kind = el.tags?.disc_golf;
    if (kind !== "tee" && kind !== "basket") continue;
    if (kind === "tee") teeCount++;
    else basketCount++;
    const hole = holeRef(el.tags);
    if (hole == null) continue;
    maxRef = Math.max(maxRef, hole);
    const par = el.tags?.par ? parseInt(el.tags.par, 10) : NaN;
    // A tee's par wins; a basket's par fills in where no tee said anything.
    if (Number.isInteger(par) && par >= 2 && par <= 7) {
      if (kind === "tee" || !parByHole.has(hole)) parByHole.set(hole, par);
    }
    if (kind === "basket" && el.lat != null && el.lon != null && !basketByHole.has(hole)) {
      basketByHole.set(hole, [el.lon, el.lat]);
    }
  }

  // Hole count, in order of trust: numbered nodes; then the bare node counts
  // (most mappers place tees/baskets without `ref` — in the field, 18 baskets
  // IS an 18-hole course); then the course's own `holes` tag; then the
  // disc-golf standard 18.
  const counted =
    basketCount >= 3 && basketCount <= 27
      ? basketCount
      : teeCount >= 3 && teeCount <= 27
        ? teeCount
        : null;
  const holes = maxRef >= 3 ? maxRef : (counted ?? fallbackHoles ?? 18);
  const pars = Array.from({ length: holes }, (_, i) => parByHole.get(i + 1) ?? 3);
  const pins = Array.from({ length: holes }, (_, i) => basketByHole.get(i + 1) ?? null);
  return { holes, pars, pins, mappedHoles: maxRef >= 3 ? maxRef : 0 };
}

/** Tees and baskets around a venue point, parsed into a scorecard. */
export async function fetchOsmDiscCourse(
  center: LngLat,
  fallbackHoles: number | null = null,
  radiusM = 1600,
): Promise<DiscCourseDetail> {
  const [lng, lat] = center;
  const query = `[out:json][timeout:25];
(node["disc_golf"="tee"](around:${radiusM},${lat},${lng});
 node["disc_golf"="basket"](around:${radiusM},${lat},${lng}););
out;`;
  const data = await overpassJson(query);
  return parseDiscCourse(data.elements ?? [], fallbackHoles);
}
