import { Fragment, type CSSProperties, type ReactNode } from "react";
import AudioControls from "@/components/AudioControls";
import DemoCta from "@/components/DemoCta";
import LineupTabs from "@/components/LineupTabs";
import MobileMenu from "@/components/MobileMenu";
import MotionToggle from "@/components/MotionToggle";
import PointerFx from "@/components/PointerFx";
import Poster from "@/components/Poster";
import ReserveButton from "@/components/ReserveButton";
import Reveal from "@/components/Reveal";
import ScrollChrome from "@/components/ScrollChrome";
import SignalMeter from "@/components/SignalMeter";
import TunnelStage from "@/components/TunnelStage";
import { EDITIONS, FAQ, LINEUP, STAGES, TICKETS, TRIP } from "@/lib/content";

const NAV = [
  { href: "#about", label: "About" },
  { href: "#lineup", label: "Lineup" },
  { href: "#stages", label: "Stages" },
  { href: "#trip", label: "Plan" },
  { href: "#faq", label: "FAQ" },
];

const ACCENT: Record<string, { text: string; bg: string }> = {
  acid: { text: "text-acid", bg: "bg-acid" },
  coral: { text: "text-coral", bg: "bg-coral" },
  cyan: { text: "text-cyan", bg: "bg-cyan" },
  haze: { text: "text-haze", bg: "bg-haze" },
};

// Honest structured data: the festival is fictional, so the page describes itself as a website, not an event.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Echo Fest",
  url: "https://echo-fest-3d.vercel.app",
  author: { "@type": "Person", name: "Alhassan Alfarran", url: "https://alhassan-portfolio-sigma.vercel.app" },
  description:
    "Concept project — fictional brand. A site for a three-night music festival in a quarry, with an audio-reactive 3D tunnel.",
};

// Section eyebrow with an editorial index number ("01").
function Eyebrow({ index, className, children }: { index: string; className: string; children: ReactNode }) {
  return (
    <p className="eyebrow flex items-baseline gap-3">
      <span className="section-index" aria-hidden="true">
        {index}
      </span>
      <span className={className}>{children}</span>
    </p>
  );
}

// Below-fold H2 with a split-word reveal (each word rises out of its own mask). Never used for the H1.
function SplitTitle({ id, text, className = "" }: { id: string; text: string; className?: string }) {
  const words = text.split(" ");
  return (
    <h2 id={id} className={`text-display font-bold uppercase ${className}`} data-reveal="split">
      {words.map((w, i) => (
        <Fragment key={i}>
          <span className="split-mask">
            <span className="split-word" style={{ "--i": i } as CSSProperties}>
              {w}
            </span>
          </span>
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </h2>
  );
}

const RAIL = ["N 61°12′ / Halvard Quarry", "124 BPM", "62 acts · 4 stages"];

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Reveal />
      <ScrollChrome />
      <PointerFx />

      <header className="fixed inset-x-0 top-0 z-40 bg-gradient-to-b from-night via-night/85 to-transparent">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-10">
          <a href="#top" className="flex min-h-11 items-center font-display text-lg font-black tracking-tight">
            ECHO<span className="text-acid">/</span>FEST
          </a>
          <nav aria-label="Main" className="hidden md:block">
            <ul className="flex items-center gap-1">
              {NAV.map((n) => (
                <li key={n.href}>
                  <a href={n.href} className="link-under flex min-h-11 items-center px-3 text-sm font-semibold">
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex items-center gap-2">
            <MobileMenu links={NAV} cta={{ href: "#tickets", label: "Get tickets" }} />
            {/* on the narrowest phones the CTA lives in the menu panel, so the header never crowds */}
            <a href="#tickets" className="btn btn-acid !min-h-11 !py-2 text-sm max-[379px]:hidden">
              Tickets
            </a>
          </div>
        </div>
        {/* page progress: a CSS scroll timeline where supported, a --progress fallback elsewhere */}
        <div className="progress-bar absolute inset-x-0 bottom-0 h-0.5 bg-acid" aria-hidden="true" />
      </header>

      <main id="main" tabIndex={-1} className="outline-none">
        {/* ---------------- HERO + THE DROP ----------------
            The section is a tall scroll track (CSS, motion only); the stage inside is sticky, so the first
            viewport is exactly the old hero and scrolling drives the drop in the 3D. */}
        <section id="top" aria-labelledby="hero-title" className="drop-track relative isolate">
          <div className="sticky top-0 flex h-[max(100svh,600px)] items-end overflow-hidden">
            <TunnelStage />
            {/* solid gradient for legibility — no backdrop-filter over the canvas */}
            <div
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,var(--color-night)_4%,rgb(11_6_20/0.82)_30%,rgb(11_6_20/0)_62%)]"
              aria-hidden="true"
            />
            {/* soft dark pool behind the copy column so bright tunnel lines don't cut through the text */}
            <div className="hero-scrim pointer-events-none absolute inset-0" aria-hidden="true" />
            <div className="hero-copy relative mx-auto w-full max-w-7xl px-4 pb-14 pt-32 sm:px-6 md:pb-20 lg:px-10">
              <p className="eyebrow hero-legible intro-lift text-acid">21—23 August 2027 · Halvard Quarry</p>
              {/* the echo trail: two outlined copies behind the real H1, which never moves */}
              <div className="relative mt-4">
                <p className="echo-copy echo-2 font-display text-mega font-black uppercase" aria-hidden="true">
                  Echo <br />
                  Fest
                </p>
                <p className="echo-copy echo-1 font-display text-mega font-black uppercase" aria-hidden="true">
                  Echo <br />
                  Fest
                </p>
                <h1 id="hero-title" className="relative text-mega font-black uppercase">
                  Echo{" "}
                  <br />
                  <span className="text-coral">Fest</span>
                </h1>
              </div>
              <p className="hero-legible intro-lift intro-2 mt-6 max-w-xl text-lg text-ink sm:text-xl">
                Three nights in a quarry that sings back. Press play and the tunnel listens.
              </p>
              <div className="intro-lift intro-3 mt-8">
                <AudioControls />
              </div>
              <MotionToggle variant="quiet" className="mt-2" />

              {/* desktop meta rail: breaks up the bottom-left stack */}
              <ul
                aria-label="At a glance"
                className="hero-legible absolute bottom-20 right-16 hidden w-60 divide-y divide-plum border-y border-plum lg:block"
              >
                {RAIL.map((r) => (
                  <li key={r} className="eyebrow py-3 tabular-nums text-ink">
                    {r}
                  </li>
                ))}
                <li className="eyebrow py-3 tabular-nums text-haze">
                  <SignalMeter />
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* ---------------- ABOUT ---------------- */}
        <section id="about" aria-labelledby="about-title" className="about-glow relative py-24 md:py-32 lg:py-40">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:px-10">
            <div className="lg:col-span-5" data-reveal>
              <Eyebrow index="01" className="text-coral">
                Since 2019
              </Eyebrow>
              <SplitTitle id="about-title" text="The valley answers back" className="mt-4" />
            </div>
            <div className="space-y-6 text-lg text-haze lg:col-span-7" data-reveal>
              <p>
                Halvard Quarry is a bowl of granite forty metres deep. Shout into it and it shouts back a quarter-second
                later. In 2019 a handful of us carried a sound system down the old haul road to see what a kick drum would
                do in there. It did a lot.
              </p>
              <p className="text-ink">
                Echo Fest is what that night grew into: 62 acts across four stages, built into the terraces of the
                quarry, lit from inside the rock and kept small on purpose. No VIP decks, no sponsor towers — just very
                good sound in a very strange place.
              </p>
            </div>
          </div>
          <div className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:px-10">
            <dl className="grid grid-cols-2 gap-px border-y border-plum bg-plum md:grid-cols-4">
              {[
                ["3", "nights"],
                ["4", "stages"],
                ["62", "acts"],
                ["9,000", "people, max"],
              ].map(([n, l]) => (
                <div key={l} className="flex flex-col-reverse gap-1 bg-night px-4 py-8 sm:px-6" data-reveal>
                  <dt className="text-sm font-semibold uppercase tracking-widest text-haze">{l}</dt>
                  <dd className="font-display text-4xl font-black text-ink sm:text-5xl">{n}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ---------------- LINEUP ---------------- */}
        <section id="lineup" aria-labelledby="lineup-title" className="chapter-lights chapter-lineup bg-dusk py-24 md:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
            <div className="flex flex-wrap items-end justify-between gap-6" data-reveal>
              <div>
                <Eyebrow index="02" className="text-cyan">
                  Announced in full
                </Eyebrow>
                <SplitTitle id="lineup-title" text="Lineup" className="mt-4" />
              </div>
              <p className="max-w-xs text-haze">Announced in full. Set times land in July.</p>
            </div>
            <div className="mt-12" data-reveal>
              <LineupTabs days={LINEUP} />
            </div>
          </div>
        </section>

        {/* ---------------- STAGES: editorial list ---------------- */}
        <section id="stages" aria-labelledby="stages-title" className="chapter-lights chapter-stages py-24 md:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
            <div data-reveal>
              <Eyebrow index="03" className="text-acid">
                Built into the terraces
              </Eyebrow>
            </div>
            <SplitTitle id="stages-title" text="Four stages, one rock" className="mt-4 max-w-4xl" />
            <ol className="mt-14 border-b border-plum">
              {STAGES.map((s, i) => (
                <li
                  key={s.name}
                  className="stage-row relative grid gap-x-10 gap-y-3 border-t border-plum py-8 md:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_minmax(0,1.3fr)] md:items-center md:py-12"
                  data-reveal
                >
                  <span className={`stage-bar absolute inset-x-0 -top-px h-1 ${ACCENT[s.accent].bg}`} aria-hidden="true" />
                  <span
                    className={`stage-num font-display text-[clamp(4rem,10vw,8rem)] font-black leading-none tabular-nums ${ACCENT[s.accent].text}`}
                    aria-hidden="true"
                  >
                    0{i + 1}
                  </span>
                  <div>
                    <h3 className="text-2xl font-bold uppercase sm:text-3xl">{s.name}</h3>
                    <p className="mt-2 text-sm font-medium tabular-nums text-haze">{s.hours}</p>
                  </div>
                  <p className="max-w-md text-haze">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------------- PAST EDITIONS (fictional history, no fake quotes) ---------------- */}
        <section id="editions" aria-labelledby="editions-title" className="border-t border-plum bg-dusk py-24 md:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
            <div data-reveal>
              <Eyebrow index="04" className="text-cyan">
                Past editions
              </Eyebrow>
            </div>
            <SplitTitle id="editions-title" text="How it got this loud" className="mt-4 max-w-4xl" />
            <ol className="relative mt-16 grid gap-10 pt-10 sm:grid-cols-2 lg:grid-cols-4" data-reveal>
              <li className="edition-line absolute inset-x-0 top-0 h-px bg-haze/40" aria-hidden="true" />
              {EDITIONS.map((e) => (
                <li key={e.year}>
                  <p className="font-display text-[clamp(2.75rem,6vw,4.5rem)] font-black leading-none tabular-nums text-ink">
                    {e.year}
                  </p>
                  <p className="mt-4 max-w-xs text-haze">{e.text}</p>
                </li>
              ))}
            </ol>
            <p className="mt-12 text-sm text-haze">Concept project — fictional history.</p>
          </div>
        </section>

        {/* ---------------- TICKETS ---------------- */}
        <section
          id="tickets"
          aria-labelledby="tickets-title"
          className="chapter-lights chapter-tickets relative overflow-hidden bg-[radial-gradient(ellipse_at_50%_0%,#2b1446_0%,var(--color-night)_62%)] py-24 md:py-32 lg:py-40"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
            <div className="max-w-2xl" data-reveal>
              <Eyebrow index="05" className="text-coral">
                Three ways in
              </Eyebrow>
              <SplitTitle id="tickets-title" text="Tickets" className="mt-4" />
              <p className="mt-4 text-lg text-haze">
                Prices include booking fees. Every ticket funds the quarry&apos;s rewilding fund.
              </p>
            </div>
            <ul className="mt-14 grid gap-6 lg:grid-cols-3">
              {TICKETS.map((t) => (
                <li
                  key={t.name}
                  className={`stub relative flex flex-col p-6 sm:p-8 ${t.featured ? "lg:-translate-y-4" : ""}`}
                  data-reveal
                >
                  {t.featured && (
                    <span className="absolute right-6 top-6 rounded-full bg-night px-3 py-1 text-xs font-bold uppercase tracking-wider text-acid ring-1 ring-acid">
                      Most picked
                    </span>
                  )}
                  <h3 className="pr-24 text-xl font-bold uppercase">{t.name}</h3>
                  <p className="mt-2 text-haze">{t.tagline}</p>
                  <p className="mt-6 font-display text-5xl font-black text-ink">
                    <span className="align-top text-2xl text-acid">€</span>
                    {t.price}
                  </p>
                  <div className="my-6 border-t-2 border-dashed border-plum" aria-hidden="true" />
                  <ul className="flex-1 space-y-3">
                    {t.includes.map((inc) => (
                      <li key={inc} className="flex gap-3">
                        <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-acid" aria-hidden="true" />
                        <span>{inc}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8">
                    <ReserveButton name={t.name} featured={t.featured} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------------- PLAN YOUR TRIP ---------------- */}
        <section id="trip" aria-labelledby="trip-title" className="border-t border-plum py-24 md:py-32">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:px-10">
            <div className="lg:col-span-4" data-reveal>
              <Eyebrow index="06" className="text-cyan">
                Before you go
              </Eyebrow>
              <SplitTitle id="trip-title" text="Plan your trip" className="mt-4" />
            </div>
            <div className="grid gap-10 sm:grid-cols-2 lg:col-span-8">
              {TRIP.map((t, i) => (
                <article key={t.title} data-reveal>
                  <h3 className="flex items-center gap-3 text-lg font-bold uppercase">
                    <span
                      className={`h-3 w-3 rounded-full ${["bg-acid", "bg-coral", "bg-cyan", "bg-haze"][i]}`}
                      aria-hidden="true"
                    />
                    {t.title}
                  </h3>
                  <p className="mt-3 text-haze">{t.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- FAQ ---------------- */}
        <section id="faq" aria-labelledby="faq-title" className="bg-dusk py-24 md:py-32">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-10">
            <div data-reveal>
              <Eyebrow index="07" className="text-haze">
                Good to know
              </Eyebrow>
            </div>
            <SplitTitle id="faq-title" text="Questions" className="mt-4" />
            <div className="mt-10 border-t border-plum">
              {FAQ.map((f) => (
                <details key={f.q} className="group border-b border-plum">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 py-5 text-lg font-semibold [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-plum text-haze transition-transform group-open:rotate-45 group-open:text-acid"
                      aria-hidden="true"
                    >
                      +
                    </span>
                  </summary>
                  <p className="pb-6 pr-12 text-haze">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- FINAL CTA ---------------- */}
        <section
          id="cta"
          aria-labelledby="cta-title"
          className="relative isolate overflow-hidden border-t border-plum bg-dusk py-28 md:py-40"
        >
          {/* the static stage poster, faint: SVG, so no second canvas */}
          <div className="pointer-events-none absolute inset-0 -z-10 opacity-25" aria-hidden="true">
            <Poster id="cta-poster" lite />
          </div>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
            <SplitTitle id="cta-title" text="See you in the quarry" className="max-w-4xl" />
            <p className="eyebrow mt-6 text-ink">21—23 August 2027 · Halvard Quarry</p>
            <div className="mt-10 flex flex-wrap gap-3">
              <a href="#tickets" className="btn btn-acid">
                Get tickets
              </a>
              <DemoCta />
            </div>
          </div>
        </section>
      </main>

      {/* ---------------- FOOTER ---------------- */}
      <footer className="border-t border-plum">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10">
          {/* decorative ghost wordmark: drawn by CSS pseudo-elements (see .ghost-mark) so it is a graphic, not text */}
          <p className="ghost-mark font-display text-[clamp(2.4rem,11vw,8rem)] font-black uppercase leading-none tracking-tight text-plum" aria-hidden="true">
            <span className="text-coral" />
          </p>
          <div className="mt-10 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2 text-sm text-haze">
              <p className="text-ink">Echo Fest · Halvard Quarry · 21—23 August 2027</p>
              <p>Concept project — fictional brand.</p>
              <p>
                Design &amp; code:{" "}
                <a
                  href="https://alhassan-portfolio-sigma.vercel.app"
                  className="link-under inline-flex min-h-11 items-center font-semibold text-ink"
                >
                  Alhassan Alfarran
                </a>
              </p>
              <p>© 2026 Alhassan Alfarran</p>
            </div>
            <MotionToggle className="self-start md:self-auto" />
          </div>
        </div>
      </footer>
    </>
  );
}
