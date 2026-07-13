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

// Per-hole GPS panel: satellite aerial (with road/place labels for orientation),
// live location via Mapbox's GeolocateControl, and a draggable pin on the green.
// Shows live yards-to-pin (haversine).
//
// Location deliberately runs through GeolocateControl, not a bare watchPosition:
// iOS only reliably grants geolocation from a user gesture, and the control's
// on-map ⊙ button is exactly that. We still try an automatic trigger once the
// map loads for platforms that allow it.
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
  // Keep the latest callbacks/props without re-running the map-init effect.
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

  // Init the map + geolocate control once.
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

    const geo = new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
      trackUserLocation: true,
      showUserHeading: true,
      showAccuracyCircle: true,
    });
    map.addControl(geo, "top-right");
    geo.on("geolocate", (pos) => {
      setGeoError(null);
      setYou([pos.coords.longitude, pos.coords.latitude]);
      setAccuracy(pos.coords.accuracy);
    });
    geo.on("error", (err) => {
      setGeoError(
        err.code === 1
          ? "Location permission denied — allow it when prompted, or in phone settings."
          : err.code === 2
            ? "Location unavailable — check Settings → Privacy → Location Services (Precise on)."
            : "GPS timed out — tap ⊙ to retry.",
      );
    });
    // Auto-start where the platform allows it (Android, already-granted iOS).
    // On a fresh iOS visit this may be ignored — the ⊙ button is the real path.
    map.once("load", () => {
      try {
        geo.trigger();
      } catch {
        /* not fatal — user taps the control */
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
              {!you ? "Tap ⊙ (top-right) to turn on GPS" : "Tap the green to set the pin"}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-[var(--muted)]">
        <span>
          {geoError
            ? geoError
            : accuracy != null
              ? `GPS ±${Math.round(toYards(accuracy))} yds`
              : "GPS off — tap ⊙ on the map"}
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
