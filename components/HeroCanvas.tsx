"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { HERO, WEDDING } from "@/lib/wedding";

/** Seconds into the clip at which the card begins its 1 s fade-in. */
const OVERLAY_REVEAL_SECONDS = 8;

/* HERO — full-viewport intro video (the "envelope reveal").
   A muted, auto-playing, inline <video> fills the stage unobstructed. The whole
   invitation card (gold Ganesha, Sanskrit invocation, names, tagline, date and
   scroll prompt) stays hidden until the reveal mark — 8 s in, so the 1 s fade
   lands right as the clip ends — or the moment a "Skip Intro" control (offered
   only while the clip plays) is tapped. Scrolling back to the top of the page
   replays the intro and re-hides the card.

   Background music is owned by the global MusicPlayer (app/layout.tsx), which
   loops /wedding-song.mp3 and renders the corner Sound On/Off toggle — the hero
   deliberately mounts no second audio source. */
export default function HeroCanvas() {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Latches whether the page is currently at the very top, so a burst of scroll
  // events at scrollY 0 can only ever trigger a single replay.
  const atTopRef = useRef(true);
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);

  /** Reveal the card once playback passes the 8 s mark (fires ~4×/s). */
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video && video.currentTime >= OVERLAY_REVEAL_SECONDS) {
      setIsOverlayVisible(true);
    }
  };

  /** Stop the clip and reveal the finale immediately. */
  const skipIntro = () => {
    videoRef.current?.pause();
    setIsOverlayVisible(true);
  };

  // Scroll-up replay: returning to the very top rewinds the clip and re-hides
  // the card, so the intro plays again and the reveal waits for the 8 s mark.
  useEffect(() => {
    atTopRef.current = window.scrollY === 0;
    const handleScroll = () => {
      if (window.scrollY > 0) {
        atTopRef.current = false;
        return;
      }
      if (atTopRef.current) return;
      atTopRef.current = true;
      const video = videoRef.current;
      if (!video) return;
      video.currentTime = 0;
      void video.play();
      setIsOverlayVisible(false);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section className="relative h-[100svh] w-full overflow-hidden bg-maroon-950">
      {/* Intro video — `muted` + `playsInline` keep silent autoplay allowed. */}
      <video
        ref={videoRef}
        src="/hero-envelope.mp4"
        autoPlay
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsOverlayVisible(true)}
      />

      {/* Cinematic vignette — keeps the text legible over the footage. */}
      <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-maroon-950/80 via-transparent to-maroon-950/90" />

      {/* Invitation card — gold Ganesha, Sanskrit invocation, names, tagline,
          date and scroll prompt. Hidden (opacity-0) so the footage is
          unobstructed, then fades in over 1s starting at the 8 s mark (or
          immediately on Skip Intro). `transition-opacity` lives on the base
          class list so the opacity flip animates on the false → true change. */}
      <div
        className={`absolute inset-0 z-20 flex items-center justify-center px-6 transition-opacity duration-1000 ease-in-out ${
          isOverlayVisible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex w-full max-w-[calc(100%-3rem)] flex-col items-center justify-center rounded-2xl border border-gold-400/50 bg-maroon-950/70 px-5 py-4 text-center shadow-[0_8px_40px_rgba(0,0,0,0.55)] backdrop-blur-md [@media(max-height:600px)]:scale-80 [@media(max-height:450px)]:scale-65">
          <div className="flex h-full w-full flex-col items-center justify-center">
            <div className="flex w-full shrink-0 flex-col items-center justify-center">
              <Image
                src={HERO.ganeshaSrc}
                alt={HERO.ganeshaAlt}
                width={70}
                height={70}
                className="mx-auto mb-2 drop-shadow-md"
                priority
              />
              <p
                lang="sa"
                className="mb-4 text-center font-serif text-sm font-normal tracking-widest text-white/90 md:text-base"
              >
                {HERO.ganeshaInvocation}
              </p>
            </div>
            <div className="flex w-full flex-col items-center">
              <p className="font-script text-5xl leading-tight text-cream-50">
                {WEDDING.coupleNames}
              </p>
              <p className="mb-2 mt-1 font-script text-2xl leading-snug text-gold-300">
                {WEDDING.coupleLine}
              </p>
              <p className="font-display text-lg font-semibold tracking-[0.2em] text-cream-50">
                {WEDDING.dateShort}
              </p>
              {/* Scroll prompt — hidden until the intro finishes, then fades in. */}
              <motion.p
                initial={false}
                animate={isOverlayVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="mt-4 font-sans text-[9px] uppercase tracking-[0.25em] text-cream-50/70"
                aria-hidden={!isOverlayVisible}
              >
                {HERO.finaleHint.toUpperCase()}
              </motion.p>
            </div>
          </div>
        </div>
      </div>

      {/* Skip Intro — offered only while the video is still playing. */}
      {!isOverlayVisible && (
        <button
          type="button"
          onClick={skipIntro}
          className="absolute bottom-6 right-6 z-30 rounded-full border border-gold-400/60 bg-maroon-950/70 px-4 py-2 font-sans text-[10px] font-medium uppercase tracking-[0.25em] text-cream-50/90 shadow-lg backdrop-blur-md transition-colors hover:bg-maroon-950/90 hover:text-gold-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
        >
          Skip Intro
        </button>
      )}
    </section>
  );
}