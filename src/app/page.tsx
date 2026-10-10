import AudioControls from "@/components/AudioControls";
import LineupTabs from "@/components/LineupTabs";
import MobileMenu from "@/components/MobileMenu";
import MotionToggle from "@/components/MotionToggle";
import ReserveButton from "@/components/ReserveButton";
import Reveal from "@/components/Reveal";
import TunnelStage from "@/components/TunnelStage";
import { FAQ, LINEUP, STAGES, TICKETS, TRIP } from "@/lib/content";

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

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "MusicEvent",
  name: "Echo Fest 2027",
  startDate: "2027-08-21T14:00",
  endDate: "2027-08-24T05:00",
  eventStatus: "https://schema.org/EventScheduled",
  location: { "@type": "Place", name: "Halvard Quarry", address: "Halvard Valley" },
  description: "Concept project — fictional brand. Three nights of electronic and alternative music in a quarry.",
};

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Reveal />

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
      </header>

      <main id="main" tabIndex={-1} className="outline-none">
        {/* ---------------- HERO ---------------- */}
        <section id="top" aria-labelledby="hero-title" className="relative isolate flex min-h-[max(100svh,600px)] items-end overflow-hidden">
          <TunnelStage />
          {/* solid gradient for legibility — no backdrop-filter over the canvas */}
          <div
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,var(--color-night)_4%,rgb(11_6_20/0.82)_30%,rgb(11_6_20/0)_62%)]"
            aria-hidden="true"
          />
          {/* soft dark pool behind the copy column so bright tunnel lines don't cut through the text */}
          <div className="hero-scrim pointer-events-none absolute inset-0" aria-hidden="true" />
          <div className="relative mx-auto w-full max-w-7xl px-4 pb-14 pt-32 sm:px-6 md:pb-20 lg:px-10">
            <p className="eyebrow hero-legible text-acid">21—23 August 2027 · Halvard Quarry</p>
            <h1 id="hero-title" className="mt-4 text-mega font-black uppercase">
              Echo{" "}
              <br />
              <span className="text-coral">Fest</span>
            </h1>
            <p className="hero-legible mt-6 max-w-xl text-lg text-ink sm:text-xl">
              Three nights in a quarry that sings back. Press play and the tunnel listens.
            </p>
            <div className="mt-8">
              <AudioControls />
            </div>
            <MotionToggle variant="quiet" className="mt-2" />
          </div>
        </section>

        {/* ---------------- ABOUT ---------------- */}
        <section id="about" aria-labelledby="about-title" className="relative py-24 md:py-32">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:px-10">
            <div className="lg:col-span-5" data-reveal>
              <p className="eyebrow text-coral">Since 2019</p>
              <h2 id="about-title" className="mt-4 text-4xl font-bold uppercase leading-[0.95] sm:text-5xl">
                The valley answers back
              </h2>
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
        <section id="lineup" aria-labelledby="lineup-title" className="bg-dusk py-24 md:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
            <div className="flex flex-wrap items-end justify-between gap-6" data-reveal>
              <div>
                <p className="eyebrow text-cyan">Announced in full</p>
                <h2 id="lineup-title" className="mt-4 text-4xl font-bold uppercase sm:text-6xl">
                  Lineup
                </h2>
              </div>
              <p className="max-w-xs text-haze">Announced in full. Set times land in July.</p>
            </div>
            <div className="mt-12" data-reveal>
              <LineupTabs days={LINEUP} />
            </div>
          </div>
        </section>

        {/* ---------------- STAGES ---------------- */}
        <section id="stages" aria-labelledby="stages-title" className="py-24 md:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
            <p className="eyebrow text-acid" data-reveal>
              Built into the terraces
            </p>
            <h2 id="stages-title" className="mt-4 max-w-3xl text-4xl font-bold uppercase leading-[0.95] sm:text-6xl" data-reveal>
              Four stages, one rock
            </h2>
            <ol className="mt-14 grid gap-px overflow-hidden border border-plum bg-plum sm:grid-cols-2">
              {STAGES.map((s, i) => (
                <li key={s.name} className="group relative bg-night p-6 sm:p-10" data-reveal>
                  <span className={`absolute left-0 top-0 h-1 w-16 ${ACCENT[s.accent].bg}`} aria-hidden="true" />
                  <div className="flex items-baseline justify-between gap-4">
                    <span className={`font-display text-sm font-bold ${ACCENT[s.accent].text}`}>0{i + 1}</span>
                    <span className="text-sm font-medium tabular-nums text-haze">{s.hours}</span>
                  </div>
                  <h3 className="mt-6 text-2xl font-bold uppercase sm:text-3xl">{s.name}</h3>
                  <p className="mt-4 max-w-md text-haze">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------------- TICKETS ---------------- */}
        <section
          id="tickets"
          aria-labelledby="tickets-title"
          className="relative overflow-hidden bg-[radial-gradient(ellipse_at_50%_0%,#2b1446_0%,var(--color-night)_62%)] py-24 md:py-32"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
            <div className="max-w-2xl" data-reveal>
              <p className="eyebrow text-coral">On sale now</p>
              <h2 id="tickets-title" className="mt-4 text-4xl font-bold uppercase sm:text-6xl">
                Tickets
              </h2>
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
                    <span className="absolute right-6 top-6 rounded-full bg-coral px-3 py-1 text-xs font-bold uppercase tracking-wider text-night">
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
              <p className="eyebrow text-cyan">Before you go</p>
              <h2 id="trip-title" className="mt-4 text-4xl font-bold uppercase leading-[0.95] sm:text-5xl">
                Plan your trip
              </h2>
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
            <h2 id="faq-title" className="text-4xl font-bold uppercase sm:text-5xl" data-reveal>
              Questions
            </h2>
            <div className="mt-10 border-t border-plum">
              {FAQ.map((f) => (
                <details key={f.q} className="group border-b border-plum">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 py-5 text-lg font-semibold [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-plum text-acid transition-transform group-open:rotate-45"
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
