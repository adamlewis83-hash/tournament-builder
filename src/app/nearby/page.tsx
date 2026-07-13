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
          ? "iPhone blocks GPS in installed web apps. Open sporos.app in Safari to use this."
          : "Couldn't get your location — allow location access and try again.",
      );
    }, 12000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (settled) return;
        settled = true;
        if (watchdog.current) clearTimeout(watchdog.current);
        search([pos.coords.longitude, pos.coords.latitude]);
      },
      (err) => {
        if (settled) return;
        settled = true;
        if (watchdog.current) clearTimeout(watchdog.current);
        setStatus("error");
        setError(
          err.code === 1
            ? "Location permission denied — allow it and try again."
            : "Couldn't get your location right now.",
        );
      },
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 11000 },
    );
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

      <Button onClick={findNearMe} disabled={status === "locating" || status === "searching"}>
        {status === "locating"
          ? "Getting your location…"
          : status === "searching"
            ? "Searching…"
            : "📍 Find courses near me"}
      </Button>

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
          No disc golf courses found nearby in OpenStreetMap.
        </Card>
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
