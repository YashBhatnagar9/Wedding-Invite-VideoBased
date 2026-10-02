"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import SectionHeading from "./SectionHeading";
import { COUNTDOWN, ITINERARY } from "@/lib/wedding";

interface Parts {
  d: number;
  h: number;
  m: number;
  s: number;
  live: boolean;
}

function diffParts(targetMs: number, nowMs: number): Parts {
  const ms = targetMs - nowMs;
  if (ms <= 0) return { d: 0, h: 0, m: 0, s: 0, live: true };
  const total = Math.floor(ms / 1000);
  return {
    d: Math.floor(total / 86400),
    h: Math.floor((total % 86400) / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
    live: false,
  };
}

/* COUNTDOWN — live Days/Hrs/Min/Sec to the first celebration.
   Hydration-safe: renders zeros on SSR, starts ticking on mount. */
export default function Countdown() {
  const targetMs = new Date(COUNTDOWN.targetIso).getTime();
  // Hydration-safe lazy init: SSR and the first client render both start at
  // zeros, so there is no server/client mismatch on this prerendered page.
  // (Calling diffParts(targetMs, Date.now()) here would render a build-time
  // snapshot on the server and a different one on the client.)
  const [t, setT] = useState<Parts>(() => ({ d: 0, h: 0, m: 0, s: 0, live: false }));
  const sectionRef = useRef<HTMLElement>(null);
  // Ticking is gated on the section being on screen AND the tab being visible,
  // so a long scroll session never burns a 1 Hz timer while off-screen.
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    let onScreen = false;
    const sync = () => setActive(onScreen && !document.hidden);
    const io = new IntersectionObserver(
      (entries) => {
        onScreen = entries[0]?.isIntersecting ?? false;
        sync();
      },
      { threshold: 0 }
    );
    io.observe(el);
    document.addEventListener("visibilitychange", sync);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    const update = () => setT(diffParts(targetMs, Date.now()));
    // Refresh on the first frame (async, so the effect body stays free of a
    // synchronous setState) and then once per second.
    const raf = requestAnimationFrame(update);
    const id = setInterval(update, 1000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(id);
    };
  }, [targetMs, active]);

  const cells = [
    { v: t.d, label: COUNTDOWN.daysLabel },
    { v: t.h, label: COUNTDOWN.hoursLabel },
    { v: t.m, label: COUNTDOWN.minutesLabel },
    { v: t.s, label: COUNTDOWN.secondsLabel },
  ];
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <section ref={sectionRef} className="bg-[#2b0609] py-20">
      <SectionHeading
        dark
        eyebrow={COUNTDOWN.eyebrow}
        title={COUNTDOWN.title}
        sub={`${ITINERARY[0].date} · ${ITINERARY[0].time}`}
      />
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6 }}
        className="mx-auto mt-10 w-[90%] max-w-md"
        role="timer"
        aria-live="off"
        aria-label={t.live ? COUNTDOWN.liveLabel : "Countdown to the celebrations"}
      >
        {t.live ? (
          <p className="rounded-2xl border border-gold-400/50 bg-maroon-950/70 px-6 py-8 text-center font-script text-4xl text-gold-300">
            {COUNTDOWN.liveLabel}
          </p>
        ) : (
          <ol className="grid grid-cols-4 gap-3">
            {cells.map((c) => (
              <li
                key={c.label}
                className="rounded-2xl border border-gold-400/50 bg-maroon-950/70 px-2 py-4 text-center shadow-[0_12px_30px_rgba(0,0,0,0.45)]"
              >
                <p className="font-display text-4xl font-bold tabular-nums text-cream-50">
                  {pad(c.v)}
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-300">
                  {c.label}
                </p>
              </li>
            ))}
          </ol>
        )}
      </motion.div>
    </section>
  );
}
