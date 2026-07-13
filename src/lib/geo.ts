// Unified geolocation for web + the native iOS shell.
//
// WebKit's geolocation API is broken inside installed/standalone web contexts
// (requests can hang with no callback), which is exactly where the Sporos iOS
// app runs. The native shell ships the Capacitor Geolocation plugin, whose
// bridge (window.Capacitor.Plugins.Geolocation) talks to CoreLocation — the
// same rock-solid path native golf apps use. Prefer it whenever it's injected;
// fall back to navigator.geolocation in ordinary browsers.
//
// NOTE: the shell loads sporos.app remotely, so we must use the runtime-
// injected global rather than importing @capacitor/geolocation in the bundle.

export type GeoFix = { lng: number; lat: number; accuracy: number };
export type GeoOptions = {
  highAccuracy?: boolean;
  maximumAgeMs?: number;
  timeoutMs?: number;
};
export type GeoFailure = { code: number; message: string }; // code mirrors web API: 1=denied 2=unavailable 3=timeout

type CapPosition = { coords: { latitude: number; longitude: number; accuracy: number } };
interface CapGeolocation {
  getCurrentPosition(opts?: object): Promise<CapPosition>;
  watchPosition(
    opts: object,
    cb: (pos: CapPosition | null, err?: { message?: string }) => void,
  ): Promise<string>;
  clearWatch(opts: { id: string }): Promise<void>;
}

function capGeo(): CapGeolocation | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    Capacitor?: { isNativePlatform?: () => boolean; Plugins?: { Geolocation?: CapGeolocation } };
  };
  if (w.Capacitor?.isNativePlatform?.() && w.Capacitor.Plugins?.Geolocation) {
    return w.Capacitor.Plugins.Geolocation;
  }
  return null;
}

/** True when running in the native shell with CoreLocation available. */
export function hasNativeGeo(): boolean {
  return capGeo() !== null;
}

function toFix(pos: CapPosition | GeolocationPosition): GeoFix {
  return {
    lng: pos.coords.longitude,
    lat: pos.coords.latitude,
    accuracy: pos.coords.accuracy,
  };
}

function capFailure(err: unknown): GeoFailure {
  const msg = err instanceof Error ? err.message : String((err as { message?: string })?.message ?? err);
  const code = /denied|permission/i.test(msg) ? 1 : /timeout/i.test(msg) ? 3 : 2;
  return { code, message: msg };
}

/** One-shot position. Rejects with a GeoFailure-shaped error. */
export async function getPosition(opts: GeoOptions = {}): Promise<GeoFix> {
  const capOpts = {
    enableHighAccuracy: opts.highAccuracy ?? false,
    maximumAge: opts.maximumAgeMs ?? 60000,
    timeout: opts.timeoutMs ?? 11000,
  };
  const native = capGeo();
  if (native) {
    try {
      return toFix(await native.getCurrentPosition(capOpts));
    } catch (e) {
      throw capFailure(e);
    }
  }
  if (!("geolocation" in navigator)) throw { code: 2, message: "no geolocation" } as GeoFailure;
  return new Promise<GeoFix>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(toFix(pos)),
      (err) => reject({ code: err.code, message: err.message } as GeoFailure),
      capOpts,
    );
  });
}

/** Continuous watch. Returns a stop() function. */
export function watchPosition(
  opts: GeoOptions,
  onFix: (fix: GeoFix) => void,
  onError: (err: GeoFailure) => void,
): () => void {
  const capOpts = {
    enableHighAccuracy: opts.highAccuracy ?? true,
    maximumAge: opts.maximumAgeMs ?? 2000,
    timeout: opts.timeoutMs ?? 30000,
  };
  const native = capGeo();
  if (native) {
    let stopped = false;
    let watchId: string | null = null;
    native
      .watchPosition(capOpts, (pos, err) => {
        if (stopped) return;
        if (pos) onFix(toFix(pos));
        else if (err) onError(capFailure(err));
      })
      .then((id) => {
        watchId = id;
        if (stopped) native.clearWatch({ id });
      })
      .catch((e) => onError(capFailure(e)));
    return () => {
      stopped = true;
      if (watchId) native.clearWatch({ id: watchId });
    };
  }
  if (!("geolocation" in navigator)) {
    onError({ code: 2, message: "no geolocation" });
    return () => {};
  }
  const id = navigator.geolocation.watchPosition(
    (pos) => onFix(toFix(pos)),
    (err) => onError({ code: err.code, message: err.message }),
    capOpts,
  );
  return () => navigator.geolocation.clearWatch(id);
}
