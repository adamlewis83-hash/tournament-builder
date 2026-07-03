import type { CapacitorConfig } from "@capacitor/cli";

// Sporos ships as a native iOS shell around the live PWA at sporos.app.
// The app loads the hosted app full-screen (no browser chrome) and gains
// native capabilities via Capacitor plugins.
const config: CapacitorConfig = {
  appId: "com.lewcrewlabs.sporos",
  appName: "Sporos",
  // Minimal local fallback; the app actually loads server.url below.
  webDir: "capacitor-www",
  server: {
    url: "https://sporos.app",
    cleartext: false,
  },
  ios: {
    // Let the web app manage the safe-area insets itself (it already does).
    contentInset: "never",
  },
  backgroundColor: "#0b1220",
};

export default config;
