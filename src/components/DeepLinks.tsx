"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type Listener = { remove?: () => void };
type AppPlugin = {
  addListener?: (
    event: "appUrlOpen",
    cb: (e: { url: string }) => void,
  ) => Promise<Listener> | Listener;
  getLaunchUrl?: () => Promise<{ url?: string } | undefined>;
};

const HANDLED = "sporos-launch-url";

// When a texted Sporos link opens the iOS app, iOS hands the app that link, but
// the app used to ignore it and show whatever screen it was last on. The friend
// who tapped it then assumed the link was broken and went back to Safari, and
// iOS remembers that choice. This takes the link and goes to its page: the
// round, the invite or the sign up.
export function DeepLinks() {
  const router = useRouter();

  useEffect(() => {
    const w = window as {
      Capacitor?: { isNativePlatform?: () => boolean; Plugins?: { App?: AppPlugin } };
    };
    if (!w.Capacitor?.isNativePlatform?.()) return;
    const app = w.Capacitor.Plugins?.App;
    if (!app?.addListener) return; // an older build without the plugin

    const go = (url: string) => {
      try {
        const u = new URL(url);
        let path: string;
        // sporos://live/CODE, from the web page's "Open in the Sporos app"
        // button. It works even when iOS isn't treating sporos.app links as
        // app links.
        if (u.protocol === "sporos:") path = `/${u.hostname}${u.pathname}${u.search}`;
        else if (u.hostname === "sporos.app" || u.hostname === "www.sporos.app")
          path = u.pathname + u.search;
        else return;
        if (path !== window.location.pathname + window.location.search) router.push(path);
      } catch {
        /* not a URL we know */
      }
    };

    // The link that cold started the app. It stays the launch URL for the life
    // of the app, so a reload would replay it; remember it was handled.
    app.getLaunchUrl?.()
      .then((r) => {
        if (!r?.url) return;
        try {
          if (sessionStorage.getItem(HANDLED) === r.url) return;
          sessionStorage.setItem(HANDLED, r.url);
        } catch {
          /* storage blocked: handle it anyway */
        }
        go(r.url);
      })
      .catch(() => {});

    // Links tapped while the app is already running.
    let handle: Listener | undefined;
    let cancelled = false;
    Promise.resolve(app.addListener("appUrlOpen", (e) => go(e.url))).then((h) => {
      if (cancelled) h?.remove?.();
      else handle = h;
    });
    return () => {
      cancelled = true;
      handle?.remove?.();
    };
  }, [router]);

  return null;
}
