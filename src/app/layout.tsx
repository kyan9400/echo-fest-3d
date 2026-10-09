import type { Metadata, Viewport } from "next";
import { Manrope, Unbounded } from "next/font/google";
import "./globals.css";

const unbounded = Unbounded({
  subsets: ["latin"],
  variable: "--font-unbounded",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const title = "Echo Fest 2027 — 21–23 August, Halvard Quarry";
const description =
  "Three nights of electronic and alternative music in a granite quarry that sings back. 62 acts, four stages, 9,000 people. Lineup, tickets and travel.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://echo-fest-3d.vercel.app"),
  title: { default: title, template: "%s · Echo Fest" },
  description,
  applicationName: "Echo Fest",
  authors: [{ name: "Alhassan Alfarran", url: "https://alhassan-portfolio-sigma.vercel.app" }],
  creator: "Alhassan Alfarran",
  keywords: ["Echo Fest", "music festival", "electronic music", "lineup", "tickets", "3D", "WebGL"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    title,
    description,
    siteName: "Echo Fest",
    locale: "en_GB",
  },
  twitter: { card: "summary_large_image", title, description },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0b0614",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${unbounded.variable} ${manrope.variable}`}>
      <body>
        <a
          href="#main"
          className="btn btn-acid fixed left-4 top-4 z-50 -translate-y-24 focus:translate-y-0"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
