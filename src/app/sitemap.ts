import type { MetadataRoute } from "next";

// static so it also works in the GitHub Pages export
export const dynamic = "force-static";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://echo-fest-3d.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${SITE}/`, lastModified: new Date("2026-10-10"), priority: 1 }];
}
