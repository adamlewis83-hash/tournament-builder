"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { SportIcon } from "@/components/SportIcon";
import { fetchDiscGolfCourses, Venue } from "@/lib/osmVenues";

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
    if (!("geolocation" in navigator)) {
      setError("This device can't share a location.");
      setStatus("error");
      return;
    }
    setStatus("locating");
    setError(null);
    if (watchdog.current) clearTimeout(watchdog.current);
    let settled = false;
    watchdog.current = setTimeout(() => {
      if (settled) return;
      settled = true;
      setStatus("error");
      setError(
        isStandaloneIOS()
          ? "iPhone blocks GPS in installed web apps — search by city below instead (or open sporos.app in Safari)."
          : "Couldn't get your location — allow location access, or search by city below.",
      );
    }, 12000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (settled) return;
        settled = true;
        if (watchdog.current) clearTimeout(watchdog.current);
        setSearchedAt({
          label: `your location (±${Math.round(pos.coords.accuracy)} m)`,
        });
        search([pos.coords.longitude, pos.coords.latitude]);
      },
      (err) => {
        if (settled) return;
        settled = true;
        if (watchdog.current) clearTimeout(watchdog.current);
        setStatus("error");
        setError(
          err.code === 1
            ? "Location permission denied — allow it, or search by city below."
            : "Couldn't get your location right now — search by city below.",
        );
      },
      // Coarse (Wi-Fi/cell) on purpose: a 25-mile course search doesn't need GPS
      // precision, and a high-accuracy request stalls indoors (esp. iPhone).
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 11000 },
    );
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
                </div>
              </div>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${v.lat},${v.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--hover)]"
              >
                Open in Maps
              </a>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
