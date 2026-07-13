"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { fetchOsmPins } from "@/lib/osmGolf";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

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

// Per-hole GPS panel: Mapbox satellite aerial, a live "you" dot from the device's
// GPS, and a draggable pin on the green. Shows live yards-to-pin (haversine).
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
  const youMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const pinMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const centeredRef = useRef(false);
  // Keep the latest onSetPin without re-running the map-init effect.
  const onSetPinRef = useRef(onSetPin);
  onSetPinRef.current = onSetPin;
  const pinRef = useRef(pin);
  pinRef.current = pin;

  const [you, setYou] = useState<[number, number] | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [loadingCourse, setLoadingCourse] = useState(false);
  const [courseMsg, setCourseMsg] = useState<string | null>(null);

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

  // Init the map + geolocation watch once.
  useEffect(() => {
    if (!TOKEN || !containerRef.current) return;
    mapboxgl.accessToken = TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/satellite-v9",
      center: pinRef.current ?? [-104.99, 39.74],
      zoom: pinRef.current ? 17 : 3,
      attributionControl: false,
    });
    mapRef.current = map;

    // Tap the aerial to set / move the pin.
    map.on("click", (e) => onSetPinRef.current([e.lngLat.lng, e.lngLat.lat]));

    let watchId: number | null = null;
    if ("geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setGeoError(null);
          const c: [number, number] = [pos.coords.longitude, pos.coords.latitude];
          setYou(c);
          setAccuracy(pos.coords.accuracy);
          // Center on the first fix — but if the style hasn't loaded yet, flyTo is
          // dropped, so defer it to the map's load event.
          if (!centeredRef.current) {
            centeredRef.current = true;
            const doCenter = () => map.flyTo({ center: pinRef.current ?? c, zoom: 17, duration: 800 });
            if (map.loaded()) doCenter();
            else map.once("load", doCenter);
          }
        },
        (err) =>
          setGeoError(
            err.code === err.PERMISSION_DENIED
              ? "Location permission denied — enable it to see yardage."
              : "Can't get a GPS signal right now.",
          ),
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
      );
    } else {
      setGeoError("This device has no GPS.");
    }

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
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
            <span className="text-xs">{pin ? "Locating you…" : "Tap the green to set the pin"}</span>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-[var(--muted)]">
        <span>
          {geoError
            ? geoError
            : accuracy != null
              ? `GPS ±${Math.round(toYards(accuracy))} yds`
              : "Getting GPS…"}
        </span>
        {pin && (
          <button type="button" onClick={() => onSetPinRef.current(null)} className="hover:underline">
            Clear pin
          </button>
        )}
      </div>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={autoLoadPins}
          disabled={loadingCourse}
          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--hover)] disabled:opacity-60"
        >
          {loadingCourse ? "Loading course…" : "⛳ Auto-load pins from course map"}
        </button>
        {courseMsg && <span className="text-xs text-[var(--muted)]">{courseMsg}</span>}
      </div>
    </div>
  );
}
