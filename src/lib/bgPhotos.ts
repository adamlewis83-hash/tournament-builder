export interface BgPhoto {
  url: string;
  credit: string;
  creditUrl: string;
}

// Curated sport photos baked into both the client and the /api/bg fallback so the
// hero backdrop paints INSTANTLY on load (no waiting on the API round-trip) and
// never goes blank. Smaller (w=1600 q=75 auto=format → WebP) for fast download.
export const FALLBACK_BG_PHOTOS: BgPhoto[] = (
  [
    ["photo-1517074009205-d9ca5d8b4a63", "Michael Jasmund"],
    ["photo-1668507911709-0249e832618d", "Marius Matuschzik"],
    ["photo-1693142518820-78d7a05f1546", "Alex Saks"],
    ["photo-1556761175-9c1bafe0f436", "Austin Distel"],
    ["photo-1771909712438-c90a7bbb6efb", "ARTO SURAJ"],
    ["photo-1496033604106-04799291ee86", "Peter Berko"],
    ["photo-1777489689168-497290f235d5", "Simone Franchina"],
    ["photo-1772515111367-ad324758a976", "Amari Shutters"],
    ["photo-1660129071363-d13390de351f", "engin akyurt"],
    ["photo-1559136560-16ad036d85d3", "Proxyclick"],
    ["photo-1725724636270-01f1b53ac17a", "Priscilla Du Preez"],
  ] as const
).map(([id, credit]) => ({
  url: `https://images.unsplash.com/${id}?w=1600&q=75&auto=format&fit=crop`,
  credit,
  creditUrl: "https://unsplash.com/?utm_source=seeded&utm_medium=referral",
}));
