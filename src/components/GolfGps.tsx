"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { fetchOsmPins } from "@/lib/osmGolf";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// iOS home-screen web apps ("standalone" display mode) have a long-standing bug
// where geolocation calls can hang with no success/error callback ever firing.
// The same site works fine in a normal browser tab, so we detect this to give
// the user the one reliable instruction: open it in Safari.
function isStandaloneIOS(): boolean {
  if (typeof window === "undefined") return false;
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  const iOS = /iP(hone|ad|od)/.test(navigator.userAgent);
  return !!standalone && iOS;
}

// Haversine distance in meters between two [lng, lat] points.
function metersBetween(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
const toYards = (m: number) => m * 1.09361;

// Per-hole GPS panel: satellite aerial (with road/place labels), live location,
// and a draggable pin on the green. Shows live yards-to-pin (haversine).
//
// Location is TWO-STAGE, started from our own button (a user gesture, which iOS
// requires): first a coarse fix (enableHighAccuracy: false — Wi-Fi/cell, works
// indoors and resolves in ~a second), then a high-accuracy GPS watch that
// silently upgrades precision once the chip locks on. A high-accuracy-only
// request stalls forever indoors, which read as "GPS can't locate me".
export function GolfGps({
  pin,
  onSetPin,
  holes,
  startHole = 1,
  onSetAllPins,
}: {
  pin: [number, number] | null;
  onSetPin: (coords: [number, number] | null) => void;
  holes: number;
  startHole?: number;
  onSetAllPins: (pins: ([number, number] | null)[]) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const pinMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const youMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const centeredRef = useRef(false);
  // Keep the latest callbacks/props without re-running the map-init effect.
  const onSetPinRef = useRef(onSetPin);
  onSetPinRef.current = onSetPin;
  const pinRef = useRef(pin);
  pinRef.current = pin;

  const [you, setYou] = useState<[number, number] | null>(null);
  const youRef = useRef(you);
  youRef.current = you;
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [loadingCourse, setLoadingCourse] = useState(false);
  const [courseMsg, setCourseMsg] = useState<string | null>(null);

  function onFix(pos: GeolocationPosition) {
    if (watchdogRef.current) clearTimeout(watchdogRef.current);
    setGeoError(null);
    setLocating(false);
    const c: [number, number] = [pos.coords.longitude, pos.coords.latitude];
    setYou(c);
    setAccuracy(pos.coords.accuracy);
    // Center on the first fix only — after that the golfer pans freely.
    const map = mapRef.current;
    if (map && !centeredRef.current) {
      centeredRef.current = true;
      map.flyTo({ center: c, zoom: 17, duration: 800 });
    }
  }

  function geoMessage(code: number): string {
    return code === 1
      ? "Location permission denied — allow it when prompted, or in phone settings."
      : code === 2
        ? "Location unavailable — check Settings → Privacy → Location Services."
        : "Location timed out — tap Locate me to retry.";
  }

  // Gesture-driven locate: coarse fix now, GPS-precision watch after.
  function locate() {
    if (!("geolocation" in navigator)) {
      setGeoError("This device has no location support.");
      return;
    }
    setLocating(true);
    setGeoError(null);
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    // Watchdog: on iOS standalone apps the geolocation callbacks can never fire
    // (no success, no error). Without this the button would spin forever, so we
    // stop it ourselves and, if we're in that known-bad context, say why.
    if (watchdogRef.current) clearTimeout(watchdogRef.current);
    watchdogRef.current = setTimeout(() => {
      if (youRef.current) return; // a fix arrived — nothing to do
      setLocating(false);
      setGeoError(
        isStandaloneIOS()
          ? "iPhone blocks GPS in installed web apps. Open sporos.app in Safari for the GPS features."
          : "Couldn't get a location fix — make sure location is allowed, then retry.",
      );
    }, 12000);
    // Stage 1 — coarse (Wi-Fi/cell): fast, works indoors, gets a dot on the map.
    navigator.geolocation.getCurrentPosition(
      onFix,
      (err) => {
        // Only surface stage-1 failure if the watch hasn't delivered anything.
        if (!youRef.current) {
          setLocating(false);
          setGeoError(geoMessage(err.code));
        }
      },
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 10000 },
    );
    // Stage 2 — precise GPS watch: upgrades the dot as the chip locks on and
    // keeps it live while walking. Errors here are soft once we have any fix.
    watchIdRef.current = navigator.geolocation.watchPosition(
      onFix,
      (err) => {
        if (!youRef.current) setGeoError(geoMessage(err.code));
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 30000 },
    );
  }

  // Pull every hole's green from OpenStreetMap around the player (or, without a
  // GPS fix yet, around the current map view) and set all pins at once.
  async function autoLoadPins() {
    const map = mapRef.current;
    const origin: [number, number] | null =
      you ?? (map ? [map.getCenter().lng, map.getCenter().lat] : null);
    if (!origin) return;
    setLoadingCourse(true);
    setCourseMsg(null);
    try {
      const { pins, found } = await fetchOsmPins(origin, holes, startHole);
      if (found === 0) {
        setCourseMsg("No course data here in OpenStreetMap — tap greens manually.");
      } else {
        onSetAllPins(pins);
        setCourseMsg(`Loaded ${found} of ${holes} greens from OpenStreetMap.`);
      }
    } catch {
      setCourseMsg("Couldn't reach OpenStreetMap — try again or tap manually.");
    } finally {
      setLoadingCourse(false);
    }
  }

  // Init the map once.
  useEffect(() => {
    if (!TOKEN || !containerRef.current) return;
    mapboxgl.accessToken = TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      // satellite-streets = aerial imagery WITH roads and place labels, so the
      // zoomed-out view is recognizable (plain satellite-v9 had no labels at all).
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: pinRef.current ?? [-104.99, 39.74],
      zoom: pinRef.current ? 17 : 10,
      attributionControl: false,
    });
    mapRef.current = map;

    // Tap the aerial to set / move the pin.
    map.on("click", (e) => onSetPinRef.current([e.lngLat.lng, e.lngLat.lat]));

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync the live "you" dot.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !you) return;
    if (!youMarkerRef.current) {
      const el = document.createElement("div");
      el.style.cssText =
        "width:16px;height:16px;border-radius:50%;background:#3b82f6;border:2px solid #fff;box-shadow:0 0 0 3px rgba(59,130,246,0.35)";
      youMarkerRef.current = new mapboxgl.Marker({ element: el }).setLngLat(you).addTo(map);
    } else {
      youMarkerRef.current.setLngLat(you);
    }
  }, [you]);

  // Sync the draggable green pin.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!pin) {
      pinMarkerRef.current?.remove();
      pinMarkerRef.current = null;
      return;
    }
    if (!pinMarkerRef.current) {
      const m = new mapboxgl.Marker({ color: "#ef4444", draggable: true }).setLngLat(pin).addTo(map);
      m.on("dragend", () => {
        const ll = m.getLngLat();
        onSetPinRef.current([ll.lng, ll.lat]);
      });
      pinMarkerRef.current = m;
    } else {
      pinMarkerRef.current.setLngLat(pin);
    }
  }, [pin]);

  // When a pin exists but we have no fix yet, keep the hole in view.
  useEffect(() => {
    const map = mapRef.current;
    if (map && pin && !you) map.flyTo({ center: pin, zoom: 17, duration: 600 });
  }, [pin, you]);

  const yards = you && pin ? Math.round(toYards(metersBetween(you, pin))) : null;

  if (!TOKEN) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--subtle)] p-4 text-sm text-[var(--muted)]">
        Map unavailable — <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> isn&apos;t set.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-xl border border-[var(--border)]">
        <div ref={containerRef} className="h-64 w-full" />
        <div className="pointer-events-none absolute left-2 top-2 rounded-lg bg-black/60 px-3 py-1.5 text-white backdrop-blur">
          {yards != null ? (
            <>
              <span className="text-2xl font-extrabold tabular-nums">{yards}</span>{" "}
              <span className="text-xs">yds to pin</span>
            </>
          ) : (
            <span className="text-xs">
              {!you ? "Tap 📍 Locate me below" : "Tap the green to set the pin"}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={locate}
          disabled={locating}
          className="rounded-lg bg-[var(--brand)] px-3 py-1.5 text-xs font-semibold text-[var(--on-brand)] hover:opacity-90 disabled:opacity-60"
        >
          {locating ? "Locating…" : you ? "📍 Re-center GPS" : "📍 Locate me"}
        </button>
        <button
          type="button"
          onClick={autoLoadPins}
          disabled={loadingCourse}
          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--hover)] disabled:opacity-60"
        >
          {loadingCourse ? "Loading course…" : "⛳ Auto-load pins from course map"}
        </button>
        {pin && (
          <button
            type="button"
            onClick={() => onSetPinRef.current(null)}
            className="text-xs text-[var(--muted)] hover:underline"
          >
            Clear pin
          </button>
        )}
      </div>
      <div className="text-xs text-[var(--muted)]">
        {geoError
          ? geoError
          : accuracy != null
            ? `GPS ±${Math.round(toYards(accuracy))} yds`
            : courseMsg ?? "GPS off — tap Locate me"}
        {courseMsg && accuracy != null ? ` · ${courseMsg}` : ""}
        {courseMsg && geoError ? ` · ${courseMsg}` : ""}
      </div>
    </div>
  );
}
