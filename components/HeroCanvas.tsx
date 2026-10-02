"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { motion, useScroll, useMotionValueEvent, useTransform } from "framer-motion";
import { WEDDING, HERO, HERO_SEQUENCE, heroFrameUrl } from "@/lib/wedding";
import { useCanvasFit } from "@/hooks/useCanvasFit";
import { useImageSequence } from "@/hooks/useImageSequence";

/* HERO — canvas image-sequence scrubbing ("envelope reveal").
   Outer wrapper is 400vh; inner stage is sticky top-0 h-100svh.
   Frames are preloaded once into Image objects, then a rAF loop LERPs the
   scrub position toward raw scroll progress and cover-draws the frame only
   when its rounded index changes. On mobile viewports every 2nd frame is
   loaded (half the GPU memory) at unchanged native asset resolution.
   Decoding WebP sequence is far cheaper on mobile GPUs than seeking video. */

/** SSR-safe mobile-viewport detection (subscribed, so rotation/fold updates). */
function subscribeViewport(cb: () => void): () => void {
  window.addEventListener("resize", cb);
  window.addEventListener("orientationchange", cb);
  return () => {
    window.removeEventListener("resize", cb);
    window.removeEventListener("orientationchange", cb);
  };
}

function getViewportSnapshot(): boolean {
  return window.innerWidth < 768;
}

function getServerSnapshot(): boolean {
  return false;
}
export default function HeroCanvas() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Cached 2D context — acquired once (on mount/resize) and reused by every
  // draw so the rAF loop never has to re-call canvas.getContext("2d").
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const framesRef = useRef<(HTMLImageElement | undefined)[]>([]);
  // Raw scroll progress (0..1) written by the scroll listener; the rAF loop
  // eases `scrub` toward it so canvas draws never run inside scroll events.
  const target = useRef(0);
  const scrub = useRef(0);
  const currentIdx = useRef(-1);
  const readyRef = useRef(false);
  const visibleRef = useRef(true);
  const drawRef = useRef<(idx: number) => void>(() => {});
  // Latches true once the envelope starts opening — hint never comes back.
  const hasOpenedRef = useRef(false);
  const total = HERO_SEQUENCE.frameCount;
  // Balanced mobile downsampling: on narrow viewports load every 2nd frame
  // (half the decoded bitmaps) while keeping each asset at native resolution.
  // useSyncExternalStore is SSR-safe and re-evaluates stride on rotation/fold.
  const isMobileViewport = useSyncExternalStore(
    subscribeViewport,
    getViewportSnapshot,
    getServerSnapshot
  );
  const stride = isMobileViewport ? 2 : 1;
  const frameCount = Math.ceil(total / stride);

  const [ready, setReady] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);

  const { scrollYProgress } = useScroll({
    target: wrapRef,
    offset: ["start start", "end end"],
  });
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    target.current = latest;
    // Fade-out threshold: once past 10%, hide the hint permanently,
    // even if the user scrolls back to 0. Ref guard avoids stale closures
    // and redundant state updates on every scroll tick.
    if (latest > 0.1 && !hasOpenedRef.current) {
      setHasOpened(true);
      hasOpenedRef.current = true;
    }
  });

  const hintOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0]);
  const hintY = useTransform(scrollYProgress, [0, 0.12], [0, -40]);
  // Finale (minimal reveal): blooms in 0.72→0.92 and stays to the end.
  const finaleOpacity = useTransform(scrollYProgress, [0.72, 0.92], [0, 1]);
  const finaleScale = useTransform(scrollYProgress, [0.72, 0.92], [0.92, 1]);
  // Reveal the emblem first, then the invitation text below it.
  const finaleTextOpacity = useTransform(scrollYProgress, [0.8, 0.94], [0, 1]);
  const shadeOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.25, 0.1, 0.45]);

  // Cover-fit draw with fallback to the nearest decoded frame (no flicker).
  useEffect(() => {
    drawRef.current = (idx: number) => {
      if (!visibleRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const list = framesRef.current;
      let img: HTMLImageElement | undefined;
      for (let i = idx; i >= 0; i--) {
        const c = list[i];
        if (c && c.complete && c.naturalWidth > 0) {
          img = c;
          break;
        }
      }
      if (!img) {
        for (let i = idx + 1; i < list.length; i++) {
          const c = list[i];
          if (c && c.complete && c.naturalWidth > 0) {
            img = c;
            break;
          }
        }
      }
      if (!img) return;
      const ctx = ctxRef.current;
      if (!ctx) return;
      // Resampling quality is configured once per context acquisition in
      // useCanvasFit — never toggled inside the per-frame draw path.
      const cw = canvas.width;
      const ch = canvas.height;
      if (!cw || !ch) return;
      const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
      const dw = img.naturalWidth * s;
      const dh = img.naturalHeight * s;
      ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
      currentIdx.current = idx;
      // Ref-guarded: avoid a React re-render on every drawn frame.
      if (!readyRef.current) {
        readyRef.current = true;
        setReady(true);
      }
    };
    return () => {
      drawRef.current = () => {};
    };
  }, []);

  // DPR-aware sizing + ResizeObserver + cached 2D context (see hooks/useCanvasFit).
  // Redraws the current frame only when the backing store was actually resized.
  useCanvasFit(canvasRef, stageRef, ctxRef, {
    onResize: () => {
      if (currentIdx.current >= 0) drawRef.current(currentIdx.current);
    },
  });

  // Preload the sequence (eager first frames + idle chunks) and repaint the
  // currently targeted frame as images stream in (see hooks/useImageSequence).
  const { loaded } = useImageSequence({
    framesRef,
    srcFor: (seqIdx) => {
      // Keep array indexes zero-based; the helper maps 0..239 to files 001..240.
      // Mobile skips alternate frames but must still load the final asset.
      const assetIndex = seqIdx === frameCount - 1
        ? total - 1
        : Math.min(seqIdx * stride, total - 1);
      return heroFrameUrl(assetIndex);
    },
    frameCount,
    onFrameLoaded: (index) => {
      // Paint frame 0 ASAP so the hero is never blank on slow 3G.
      if (index === 0) drawRef.current(0);
      // Keep the currently targeted frame fresh as frames stream in.
      const want = Math.min(frameCount - 1, Math.round(scrub.current));
      if (want !== currentIdx.current) drawRef.current(want);
    },
  });

  // rAF loop: ease smooth toward target, draw only when the index changes.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let raf: number | null = null;
    let disposed = false;
    const tick = () => {
      raf = null;
      if (disposed || !visibleRef.current || document.hidden) return;
      // LERP scrub: ease the smoothed frame position toward the raw scroll
      // target (0.15 ≈ critically damped on 60 Hz, no overshoot).
      const targetFrame = target.current * (frameCount - 1);
      scrub.current += (targetFrame - scrub.current) * 0.15;
      if (Math.abs(targetFrame - scrub.current) < 0.001) {
        scrub.current = targetFrame;
      }
      // Draw only when the rounded frame index actually changes.
      const idx = Math.round(scrub.current);
      if (idx !== currentIdx.current) drawRef.current(idx);
      raf = requestAnimationFrame(tick);
    };
    const syncAnimation = () => {
      if (disposed) return;
      if (visibleRef.current && !document.hidden) {
        if (raf === null) raf = requestAnimationFrame(tick);
      } else if (raf !== null) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    };
    const rect = stage.getBoundingClientRect();
    visibleRef.current = rect.bottom > 0 && rect.top < window.innerHeight;
    const observer = new IntersectionObserver(([entry]) => {
      visibleRef.current = entry.isIntersecting;
      if (entry.isIntersecting) {
        currentIdx.current = -1;
        scrub.current = target.current * (frameCount - 1);
      }
      syncAnimation();
    });
    observer.observe(stage);
    document.addEventListener("visibilitychange", syncAnimation);
    syncAnimation();
    return () => {
      disposed = true;
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncAnimation);
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, [frameCount]);

  const pct = Math.min(100, Math.round((loaded / Math.max(frameCount, 1)) * 100));

  return (
    <section ref={wrapRef} className="relative h-[400vh] bg-maroon-950">
      {/* Pinned stage — stays fixed while the 400vh wrapper scrolls */}
      <div ref={stageRef} className="sticky top-0 h-screen h-[100svh] w-full overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label={HERO.frameAlt}
        />
        {/* Loading veil until the first frame is on screen */}
        {!ready && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-maroon-950 px-6 text-center">
            <p className="font-script text-4xl text-gold-300">{HERO.title}</p>
            <p className="text-[11px] uppercase tracking-[0.3em] text-cream-200/70">
              {HERO.loadingLabel} {pct}%
            </p>
            <div className="h-1 w-40 overflow-hidden rounded-full bg-cream-200/20">
              <div
                className="h-full rounded-full bg-gold-400 transition-[width]"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {/* Cinematic vignette, deepens as the envelope opens */}
        <motion.div
          style={{ opacity: shadeOpacity }}
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-maroon-950/80 via-transparent to-maroon-950/90"
        />

        {/* Opening hint — fades smoothly as scrubbing begins, then stays
            hidden permanently once the envelope has started opening. */}
        <motion.div
          style={hasOpened ? undefined : { opacity: hintOpacity, y: hintY }}
          animate={hasOpened ? { opacity: 0, y: -40 } : {}}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className={`absolute inset-x-0 top-[12svh] flex flex-col items-center px-6 text-center ${
            hasOpened ? "pointer-events-none opacity-0" : ""
          }`}
          aria-hidden={hasOpened}
        >
          <p className="font-script text-5xl text-gold-300 drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
            {HERO.title}
          </p>
          <p className="mt-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.35em] text-cream-100/90">
            <span className="inline-block h-px w-8 bg-gold-400/80" />
            {HERO.scrollHint}
            <span className="inline-block h-px w-8 bg-gold-400/80" />
          </p>
          <motion.span
            animate={ready ? { y: [0, 10, 0] } : {}}
            transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
            className="mt-4 text-2xl text-gold-300"
            aria-hidden
          >
            {HERO.scrollIcon}
          </motion.span>
        </motion.div>

        {/* Finale — gold Ganesha first, then names, tagline, date, scroll prompt.
            Compact by design: fits the frame with no overflow. */}
        <motion.div
          style={{ opacity: finaleOpacity, scale: finaleScale }}
          className="pointer-events-none absolute inset-0 flex items-center justify-center px-6"
        >
          <div className="flex w-full max-w-[calc(100%-3rem)] flex-col items-center justify-center rounded-2xl border border-gold-400/50 bg-maroon-950/70 px-5 py-4 text-center shadow-[0_8px_40px_rgba(0,0,0,0.55)] backdrop-blur-md [@media(max-height:600px)]:scale-80 [@media(max-height:450px)]:scale-65">
            <div className="flex h-full w-full flex-col items-center justify-center">
              <div className="flex w-full shrink-0 flex-col items-center justify-center">
                <Image src="/ganesha.webp" alt="Shree Ganesha" width={70} height={70} className="mx-auto mb-2 drop-shadow-md" priority />
                <p lang="sa" className="mb-4 text-center font-serif text-sm font-normal tracking-widest text-white/90 md:text-base">
                  {HERO.ganeshaInvocation}
                </p>
              </div>
              <motion.div
                style={{ opacity: finaleTextOpacity }}
                className="flex w-full flex-col items-center"
              >
                <p className="font-script text-5xl leading-tight text-cream-50">
                  {WEDDING.coupleNames}
                </p>
                <p className="mb-2 mt-1 font-script text-2xl leading-snug text-gold-300">
                  {WEDDING.coupleLine}
                </p>
                <p className="font-display text-lg font-semibold tracking-[0.2em] text-cream-50">
                  {WEDDING.dateShort}
                </p>
                <p className="mt-4 animate-pulse font-sans text-[9px] uppercase tracking-[0.25em] text-cream-50/50">
                  {HERO.finaleHint.toUpperCase()}
                </p>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
