import type { NextConfig } from "next";

// GH_PAGES=1 builds a static mirror for GitHub Pages (served from /echo-fest-3d)
const pages = process.env.GH_PAGES === "1";
const base = "/echo-fest-3d";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  ...(pages
    ? {
        output: "export",
        basePath: base,
        assetPrefix: base,
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {
        // best-practice headers; the microphone stays allowed for this origin (the tunnel can listen)
        // (static export has no server, so headers only apply on Vercel)
        async headers() {
          return [
            {
              source: "/:path*",
              headers: [
                { key: "X-Content-Type-Options", value: "nosniff" },
                { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                { key: "Permissions-Policy", value: "microphone=(self), camera=(), geolocation=()" },
                { key: "X-Frame-Options", value: "SAMEORIGIN" },
              ],
            },
          ];
        },
      }),
};

export default nextConfig;
