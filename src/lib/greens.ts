// Green geometry — front/center/back yardages from a green polygon.
//
// The numbers every rangefinder app shows: FRONT is the nearest point of the
// green's boundary to where you stand, CENTER its centroid, BACK the farthest
// point. Front and back move as you walk (they're relative to your angle of
// attack); center is fixed. All math runs in a local equirectangular projection
// around the player — at green scale (tens of meters) that's accurate to
// centimeters and keeps everything planar.

export type LngLat = [number, number];

const R = 6371000;
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

/** Haversine distance in meters between two [lng, lat] points. */
export function metersBetween(a: LngLat, b: LngLat): number {
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export const toYards = (m: number) => m * 1.09361;

function project(p: LngLat, lat0: number): [number, number] {
  const k = Math.cos(toRad(lat0));
  return [toRad(p[0]) * k * R, toRad(p[1]) * R];
}

function unproject(x: number, y: number, lat0: number): LngLat {
  const k = Math.cos(toRad(lat0));
  return [toDeg(x / (R * k)), toDeg(y / R)];
}

/** Area centroid of a ring (shoelace), falling back to the vertex average for
 *  degenerate rings. Ring may be open or closed — both handled. */
export function centroidOf(ring: LngLat[]): LngLat {
  const lat0 = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  const abs = ring.map((p) => project(p, lat0));
  // Shoelace on planet-scale coordinates (~1e7 m) loses meters to float
  // cancellation — run it relative to the first vertex, where everything is
  // green-sized, then translate back.
  const [ox, oy] = abs[0];
  const pts = abs.map(([x, y]) => [x - ox, y - oy] as [number, number]);
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    const cross = x1 * y2 - x2 * y1;
    a += cross;
    cx += (x1 + x2) * cross;
    cy += (y1 + y2) * cross;
  }
  if (Math.abs(a) < 1e-6) {
    const mx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
    const my = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    return unproject(mx + ox, my + oy, lat0);
  }
  return unproject(cx / (3 * a) + ox, cy / (3 * a) + oy, lat0);
}

/** The boundary points that read as "front" (closest to the player — projected
 *  onto each edge, not just vertices) and "back" (farthest — always a vertex
 *  when the player stands outside the green). */
export function frontBackOf(origin: LngLat, ring: LngLat[]): { front: LngLat; back: LngLat } {
  const lat0 = origin[1];
  const o = project(origin, lat0);
  const pts = ring.map((p) => project(p, lat0));

  let front: [number, number] = pts[0];
  let frontD = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const abx = b[0] - a[0];
    const aby = b[1] - a[1];
    const len2 = abx * abx + aby * aby;
    const t = len2
      ? Math.max(0, Math.min(1, ((o[0] - a[0]) * abx + (o[1] - a[1]) * aby) / len2))
      : 0;
    const q: [number, number] = [a[0] + t * abx, a[1] + t * aby];
    const d = (q[0] - o[0]) ** 2 + (q[1] - o[1]) ** 2;
    if (d < frontD) {
      frontD = d;
      front = q;
    }
  }

  let back = pts[0];
  let backD = -1;
  for (const p of pts) {
    const d = (p[0] - o[0]) ** 2 + (p[1] - o[1]) ** 2;
    if (d > backD) {
      backD = d;
      back = p;
    }
  }

  return { front: unproject(front[0], front[1], lat0), back: unproject(back[0], back[1], lat0) };
}

export interface Fcb {
  front: number;
  center: number;
  back: number;
}

/** Front/center/back in whole yards from the player's position, or null when
 *  the ring can't describe a green (fewer than 3 points). */
export function fcbYards(origin: LngLat, ring: LngLat[] | null | undefined): Fcb | null {
  if (!ring || ring.length < 3) return null;
  const { front, back } = frontBackOf(origin, ring);
  return {
    front: Math.round(toYards(metersBetween(origin, front))),
    center: Math.round(toYards(metersBetween(origin, centroidOf(ring)))),
    back: Math.round(toYards(metersBetween(origin, back))),
  };
}
