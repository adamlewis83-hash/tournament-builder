import type { MetadataRoute } from "next";

const BASE = "https://sporos.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}/`, priority: 1 },
    { url: `${BASE}/bracket-maker`, priority: 0.9 },
    { url: `${BASE}/pickleball-tournament`, priority: 0.9 },
    { url: `${BASE}/pickleball-round-robin`, priority: 0.9 },
    { url: `${BASE}/golf-scorecard`, priority: 0.9 },
    { url: `${BASE}/cornhole-bracket`, priority: 0.9 },
    { url: `${BASE}/support`, priority: 0.4 },
    { url: `${BASE}/privacy`, priority: 0.3 },
  ];
}
