import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Marketing + info pages are for crawlers; live sessions and personal
      // tournament pages are not useful (or appropriate) search results.
      { userAgent: "*", allow: "/", disallow: ["/t/", "/live/", "/api/"] },
    ],
    sitemap: "https://sporos.app/sitemap.xml",
  };
}
