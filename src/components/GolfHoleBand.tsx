"use client";

import { useEffect, useRef, useState } from "react";
import { fcbYards, metersBetween, toYards } from "@/lib/greens";
import { GeoFailure, getPosition, watchPosition } from "@/lib/geo";

// The 7a GPS band — the dark-green strip at the top of the hole screen. Hero
// number is yards to the CENTER of the green (or to the pin when only a pin is
// set), with front/back and a derived layup underneath. No map lives here —
// the "Map" affordance expands the full GolfGps panel below. Degrades to
// hole/par/SI when the course has no green data yet.
//
// Location is the same two-stage locate GolfGps uses (coarse fix, then a GPS
// watch that upgrades it), just without the Mapbox weight.
export function GpsBand({
  holeNo,
  par,
  si,
  green,
  pin,
  mapOpen,
  onToggleMap,
}: {
  holeNo: number;
  par: number;
  si: number;
  green: [number, number][] | null;
  pin: [number, number] | null;
  mapOpen: boolean;
  onToggleMap: () => void;
}) {
  const [you, setYou] = useState<[number, number] | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoErr, setGeoErr] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);
  useEffect(() => () => stopRef.current?.(), []);

  function locate() {
    setLocating(true);
    setGeoErr(false);
    stopRef.current?.();
    const onFix = (fix: { lng: number; lat: number; accuracy: number }) => {
      setLocating(false);
      setYou([fix.lng, fix.lat]);
      setAccuracy(fix.accuracy);
    };
    getPosition({ highAccuracy: false, maximumAgeMs: 60000, timeoutMs: 10000 })
      .then(onFix)
      .catch((err: GeoFailure) => {
        void err;
        setLocating(false);
      });
    stopRef.current = watchPosition(
      { highAccuracy: true, maximumAgeMs: 2000, timeoutMs: 30000 },
      onFix,
      () => {
        setLocating(false);
        setGeoErr(true);
      },
    );
  }

  const fcb = you ? fcbYards(you, green) : null;
  const pinYds = you && pin ? Math.round(toYards(metersBetween(you, pin))) : null;
  const hero = fcb?.center ?? pinYds;
  // A layup target for free: the spot that leaves a full 100 in — only worth
  // showing when you're far enough out for laying up to be a real choice.
  const layup = fcb && fcb.center > 130 ? fcb.center - 100 : null;
  const hasTarget = !!green || !!pin;

  return (
    <div className="rounded-xl bg-gradient-to-br from-[var(--brand-strong)] to-[var(--brand)] px-4 py-3 text-[var(--on-brand)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wide opacity-75">
            Hole {holeNo} · Par {par} · SI {si}
          </div>
          {hero != null ? (
            <>
              <div className="mt-0.5 text-4xl font-extrabold tabular-nums leading-none">
                {hero}
                <span className="ml-1 text-sm font-semibold opacity-80">yds</span>
              </div>
              <div className="mt-1 text-xs opacity-90 tabular-nums">
                {fcb ? (
                  <>
                    F {fcb.front} · B {fcb.back}
                    {layup != null ? ` · layup 100-out ${layup}` : ""}
                    {pinYds != null && pinYds !== fcb.center ? ` · pin ${pinYds}` : ""}
                  </>
                ) : (
                  "to the pin"
                )}
              </div>
            </>
          ) : (
            <div className="mt-1 text-sm opacity-90">
              {!hasTarget
                ? "No green mapped yet — open the map and auto-load the course."
                : geoErr
                  ? "Couldn't get a GPS fix — allow location and retry."
                  : "Tap Locate for live yardages."}
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {hasTarget && (
            <button
              type="button"
              onClick={locate}
              disabled={locating}
              className="rounded-lg bg-white/15 px-2.5 py-1 text-xs font-semibold backdrop-blur transition hover:bg-white/25 disabled:opacity-60"
            >
              {locating
                ? "Locating…"
                : you && accuracy != null
                  ? `📍 ±${Math.round(toYards(accuracy))} yds`
                  : "📍 Locate"}
            </button>
          )}
          <button
            type="button"
            onClick={onToggleMap}
            className="rounded-lg bg-white/15 px-2.5 py-1 text-xs font-semibold backdrop-blur transition hover:bg-white/25"
          >
            🗺 Map {mapOpen ? "▴" : "▾"}
          </button>
        </div>
      </div>
    </div>
  );
}
