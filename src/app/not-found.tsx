import type { Metadata } from "next";
import Link from "next/link";
import Poster from "@/components/Poster";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <main id="main" tabIndex={-1} className="relative isolate flex min-h-[100svh] items-center overflow-hidden outline-none">
      <div className="absolute inset-0 -z-10 opacity-60" aria-hidden="true">
        <Poster />
      </div>
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,var(--color-night)_20%,rgb(11_6_20/0.6))]" aria-hidden="true" />
      <div className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 lg:px-10">
        <p className="eyebrow text-coral">Error 404</p>
        <h1 className="mt-4 max-w-3xl text-5xl font-black uppercase leading-[0.92] sm:text-7xl">Nothing echoes here</h1>
        <p className="mt-6 max-w-md text-lg text-haze">
          This page wandered off into the quarry. Head back to the main stage.
        </p>
        <Link href="/" className="btn btn-acid mt-8">
          Back to Echo Fest
        </Link>
        <p className="mt-16 text-sm text-haze">Concept project — fictional brand. © 2026 Alhassan Alfarran</p>
      </div>
    </main>
  );
}
