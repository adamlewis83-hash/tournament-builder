"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { SportIcon } from "@/components/SportIcon";
import { fetchDiscGolfCourses, Venue } from "@/lib/osmVenues";
import { fetchOsmDiscCourse } from "@/lib/osmDiscGolf";
import { useStore } from "@/lib/store";
import { GeoFailure, getPosition, hasNativeGeo } from "@/lib/geo";

const IN_LIBRARY = "in your library";

// iOS home-screen web apps can hang geolocation with no callback; detect so we
// can point the user to Safari instead of spinning forever (see GolfGps).
function isStandaloneIOS(): boolean {
  if (typeof window === "undefined") return false;
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return !!standalone && /iP(hone|ad|od)/.test(navigator.userAgent);
}

const miles = (m: number) => m / 1609.34;

export default function NearbyPage() {
  const [status, setStatus] = useState<"idle" | "locating" | "searching" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [widened, setWidened] = useState(false);
  const [searchedAt, setSearchedAt] = useState<{ label: string } | null>(null);
  const [place, setPlace] = useState("");
  const watchdog = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveCourse = useStore((s) => s.saveCourse);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [savedMsg, setSavedMsg] = useState<Record<string, string>>({});

  // Pull the course's per-hole nodes (tees/baskets with hole number and par)
  // and save a ready-to-play scorecard to the library. Courses without
  // per-hole mapping still save fine — disc golf's default is par 3s.
  async function importVenue(v: Venue) {
    setSaving((m) => ({ ...m, [v.id]: true }));
    try {
      let detail = {
        holes: v.holes ?? 18,
        pars: Array.from({ length: v.holes ?? 18 }, () => 3),
        pins: [] as ([number, number] | null)[],
        mappedHoles: 0,
      };
      try {
        detail = await fetchOsmDiscCourse([v.lng, v.lat], v.holes);
      } catch {
        /* Overpass busy — save with defaults; details can refresh another day */
      }
      saveCourse({
        name: v.name,
        holes: detail.holes,
        pars: detail.pars,
        strokeIndex: Array.from({ length: detail.holes }, (_, i) => i + 1),
        lat: v.lat,
        lng: v.lng,
        pins: detail.pins.some(Boolean) ? detail.pins : undefined,
      });
      setSavedMsg((m) => ({
        ...m,
        [v.id]: detail.pins.some(Boolean)
          ? `${IN_LIBRARY} · baskets mapped`
          : detail.mappedHoles > 0
            ? `${IN_LIBRARY} · pars from OSM`
            : IN_LIBRARY,
      }));
    } finally {
      setSaving((m) => ({ ...m, [v.id]: false }));
    }
  }

  async function search(center: [number, number]) {
    setStatus("searching");
    try {
      let list = await fetchDiscGolfCourses(center, 40000);
      let didWiden = false;
      if (list.length === 0) {
        didWiden = true;
        list = await fetchDiscGolfCourses(center, 120000); // widen to ~75 mi
      }
      setWidened(didWiden);
      setVenues(list.slice(0, 25));
      setStatus("done");
    } catch {
      setError("Couldn't reach OpenStreetMap. Try again in a moment.");
      setStatus("error");
    }
  }

  function findNearMe() {
    setStatus("locating");
    setError(null);
    if (watchdog.current) clearTimeout(watchdog.current);
    let settled = false;
    watchdog.current = setTimeout(() => {
      if (settled) return;
      settled = true;
      setStatus("error");
      setError(
        isStandaloneIOS() && !hasNativeGeo()
          ? "iPhone blocks GPS in home-screen web apps — search by city below (or use the Sporos app / Safari)."
          : "Couldn't get your location — allow location access, or search by city below.",
      );
    }, 12000);
    // lib/geo prefers the native CoreLocation bridge in the iOS shell; coarse
    // (Wi-Fi/cell) on purpose — a 25-mile course search doesn't need GPS
    // precision, and a high-accuracy request stalls indoors.
    getPosition({ highAccuracy: false, maximumAgeMs: 300000, timeoutMs: 11000 })
      .then((fix) => {
        if (settled) return;
        settled = true;
        if (watchdog.current) clearTimeout(watchdog.current);
        setSearchedAt({ label: `your location (±${Math.round(fix.accuracy)} m)` });
        search([fix.lng, fix.lat]);
      })
      .catch((err: GeoFailure) => {
        if (settled) return;
        settled = true;
        if (watchdog.current) clearTimeout(watchdog.current);
        setStatus("error");
        setError(
          err.code === 1
            ? "Location permission denied — allow it, or search by city below."
            : "Couldn't get your location right now — search by city below.",
        );
      });
  }

  // No-GPS path (iPhone's installed app blocks geolocation; also handy for
  // trips): geocode a typed city/place via Mapbox and search around it.
  async function findNearPlace() {
    const q = place.trim();
    if (q.length < 2) return;
    setStatus("locating");
    setError(null);
    try {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      const res = await fetch(
        `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(q)}&limit=1&access_token=${token}`,
      );
      const json = await res.json();
      const feat = json?.features?.[0];
      const coords: [number, number] | undefined = feat?.geometry?.coordinates;
      if (!coords) {
        setStatus("error");
        setError(`Couldn't find "${q}" — try a city name like "Broomfield, CO".`);
        return;
      }
      setSearchedAt({
        label: feat?.properties?.full_address || feat?.properties?.name || q,
      });
      await search(coords);
    } catch {
      setStatus("error");
      setError("Place lookup failed — try again in a moment.");
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <Link href="/" className="text-sm text-[var(--muted)] hover:underline">
          ← All tournaments
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold">
          <SportIcon sport="disc golf" className="h-6 w-6 text-[var(--brand)]" /> Disc golf near you
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Finds disc golf courses around you from OpenStreetMap.
        </p>
      </div>

      <div className="space-y-2">
        <Button onClick={findNearMe} disabled={status === "locating" || status === "searching"}>
          {status === "locating"
            ? "Getting your location…"
            : status === "searching"
              ? "Searching…"
              : "📍 Find courses near me"}
        </Button>
        <div className="flex gap-2">
          <input
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                findNearPlace();
              }
            }}
            placeholder="…or a city or place, e.g. Broomfield, CO"
            className="w-full max-w-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
          />
          <Button
            variant="outline"
            onClick={findNearPlace}
            disabled={place.trim().length < 2 || status === "locating" || status === "searching"}
          >
            Search
          </Button>
        </div>
      </div>

      {error && (
        <Card className="p-4 text-sm text-[var(--muted)]">
          {error}
          {isStandaloneIOS() && status === "error" && (
            <>
              {" "}
              <a href="https://sporos.app/nearby" className="text-[var(--brand)] underline">
                Open in Safari
              </a>
            </>
          )}
        </Card>
      )}

      {status === "done" && venues.length === 0 && (
        <Card className="p-6 text-center text-sm text-[var(--muted)]">
          No disc golf courses found within ~75 mi in OpenStreetMap.
        </Card>
      )}

      {searchedAt && (status === "done" || status === "error") && (
        <p className="text-xs text-[var(--muted)]">Searched around {searchedAt.label}.</p>
      )}

      {venues.length > 0 && (
        <div className="space-y-2">
          {widened && (
            <p className="text-xs text-[var(--muted)]">
              None within ~25 mi — showing the closest farther out.
            </p>
          )}
          {venues.map((v) => (
            <Card key={v.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <div className="truncate font-semibold">{v.name}</div>
                <div className="text-xs text-[var(--muted)]">
                  {miles(v.meters).toFixed(1)} mi
                  {v.holes ? ` · ${v.holes} holes` : ""}
                  {savedMsg[v.id] ? ` · ${savedMsg[v.id]}` : ""}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  disabled={!!saving[v.id] || !!savedMsg[v.id]}
                  onClick={() => importVenue(v)}
                  className="rounded-lg border border-[var(--brand)]/50 px-3 py-1.5 text-xs font-semibold text-[var(--brand)] transition hover:bg-[var(--brand-soft)] disabled:opacity-60"
                >
                  {saving[v.id] ? "Importing…" : savedMsg[v.id] ? "✓ Saved" : "Save course"}
                </button>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${v.lat},${v.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--hover)]"
                >
                  Maps
                </a>
              </div>
            </Card>
          ))}
          <p className="text-[11px] text-[var(--muted)]">
            Save a course and it&apos;s ready in golf setup under &ldquo;Load a saved course&rdquo; —
            hole count and pars come from OpenStreetMap where mapped (par 3s otherwise), and mapped
            basket positions light up distance-to-basket on the hole screen.
          </p>
        </div>
      )}
    </div>
  );
}
