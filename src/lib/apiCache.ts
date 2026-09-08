import { prisma } from "./prisma";

// A durable answer store for third-party APIs with hard daily quotas
// (GolfCourseAPI's free tier: 35 calls/day across ALL of Sporos). Course data
// barely changes, so each unique question should cost one upstream call and
// then live here. When the quota is hit or the upstream is down, a stale
// answer beats no answer — pars and slope ratings from last month are still
// right.
//
// Degrades to a passthrough if the cache table doesn't exist yet: every read
// and write is best-effort.

export async function cachedJson<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T | null>,
): Promise<{ data: T; stale: boolean } | null> {
  let row: { data: unknown; updatedAt: Date } | null = null;
  try {
    row = await prisma.golfApiCache.findUnique({ where: { key } });
  } catch {
    /* table missing or db hiccup — behave as uncached */
  }

  if (row && Date.now() - row.updatedAt.getTime() < ttlMs) {
    return { data: row.data as T, stale: false };
  }

  try {
    const fresh = await fetcher();
    if (fresh !== null) {
      try {
        await prisma.golfApiCache.upsert({
          where: { key },
          create: { key, data: fresh as object },
          update: { data: fresh as object },
        });
      } catch {
        /* cache write is best-effort */
      }
      return { data: fresh, stale: false };
    }
  } catch {
    /* upstream failed — fall through to stale */
  }

  // Upstream said no (quota, outage) — last month's course data is still right.
  if (row) return { data: row.data as T, stale: true };
  return null;
}

export const DAY = 86_400_000;
