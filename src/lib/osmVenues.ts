// Find sports venues near a point from OpenStreetMap (free, no key).
// Scoped to disc golf for now — OSM maps disc golf courses well as named
// `leisure=disc_golf_course` features (unlike pickleball, which is sparsely
// named), so this is the one sport that meets an "accurate and useful" bar.
import { overpassJson } from "./osmGolf";

export interface Venue {
  id: string;
  name: string;
  lat: number;
  lng: number;
  holes: number | null;
  meters: number; // distance from the search point
}

function metersBetween(aLng: number, aLat: number, bLng: number, bLat: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// Disc golf courses within `radiusM` of [lng, lat], nearest first. Disc golf
// courses are sparse, so the caller can widen the radius if nothing turns up.
export async function fetchDiscGolfCourses(
  center: [number, number],
  radiusM = 40000,
): Promise<Venue[]> {
  const [lng, lat] = center;
  const query = `[out:json][timeout:25];
(way["leisure"="disc_golf_course"](around:${radiusM},${lat},${lng});
 relation["leisure"="disc_golf_course"](around:${radiusM},${lat},${lng});
 node["leisure"="disc_golf_course"](around:${radiusM},${lat},${lng}););
out tags center;`;

  const data = await overpassJson(query);

  const venues: Venue[] = [];
  for (const el of data.elements) {
    const t = el.tags ?? {};
    const lat2 = el.center?.lat ?? el.lat;
    const lng2 = el.center?.lon ?? el.lon;
    if (lat2 == null || lng2 == null) continue;
    const name = t.name?.trim() || "";
    // Mappers sometimes put the course tag on per-hole features ("Disc Golf
    // Basket #4", "Tee #7", "Hole 12") — those aren't courses, skip them.
    if (/(?:basket|tee)\s*#?\d|^hole\s*\d+$/i.test(name)) continue;
    const holesTag = t.holes ? parseInt(t.holes, 10) : NaN;
    venues.push({
      id: `${el.type}/${el.id}`,
      name: name || "Disc golf course",
      lat: lat2,
      lng: lng2,
      holes: Number.isNaN(holesTag) ? null : holesTag,
      meters: metersBetween(lng, lat, lng2, lat2),
    });
  }
  // One course is often mapped as several overlapping shapes (an outline plus
  // fairway pieces). Collapse anything within ~500m of an already-kept venue,
  // considering named venues first so the real name wins over a blank shape.
  const byDist = (a: Venue, b: Venue) => a.meters - b.meters;
  const named = venues.filter((v) => v.name !== "Disc golf course").sort(byDist);
  const unnamed = venues.filter((v) => v.name === "Disc golf course").sort(byDist);
  const keep: Venue[] = [];
  for (const v of [...named, ...unnamed]) {
    if (!keep.some((k) => metersBetween(k.lng, k.lat, v.lng, v.lat) < 500)) keep.push(v);
  }
  return keep.sort(byDist);
}
