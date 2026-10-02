"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import SectionHeading from "./SectionHeading";
import { SCRATCH, WEDDING } from "@/lib/wedding";

const REVEAL_AT = 0.3;
const LINE_WIDTH = 60;

/* SCRATCH CARD — canvas "scratch to reveal" for the wedding date.
   Gold foil painted on canvas; drags erase via destination-out. */
export default function ScratchCard() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Cached 2D context — created ONCE with willReadFrequently so the pointerup
  // getImageData() read-back never stalls on a GPU-backed canvas.
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const painting = useRef(false);
  const done = useRef(false);
  // Last pointer position in CSS px — drives continuous line segments.
  const last = useRef<{ x: number; y: number } | null>(null);
  // Pending "fade out, then flag as revealed" timer from measure(); cleared on
  // reset and on unmount so it can never fire against a stale canvas.
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [progress, setProgress] = useState(0);

  const paintCover = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#a8821c");
    g.addColorStop(0.25, "#e3c476");
    g.addColorStop(0.5, "#c9a227");
    g.addColorStop(0.75, "#eed9a4");
    g.addColorStop(1, "#a8821c");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    for (let i = 0; i < 220; i++) {
      ctx.fillRect(Math.random() * w, Math.random() * h, 1.4, 1.4);
    }
    ctx.fillStyle = "rgba(62,10,15,0.12)";
    for (let i = 0; i < 140; i++) {
      ctx.fillRect(Math.random() * w, Math.random() * h, 1.2, 1.2);
    }
    ctx.fillStyle = "rgba(62,10,15,0.82)";
    ctx.textAlign = "center";
    ctx.font = `600 ${Math.min(22, w * 0.055)}px Georgia, serif`;
    ctx.fillText(SCRATCH.foilTitle, w / 2, h / 2 - 6);
    ctx.font = `${Math.min(15, w * 0.04)}px Georgia, serif`;
    ctx.fillText(SCRATCH.foilHint, w / 2, h / 2 + 22);
    done.current = false;
    setRevealed(false);
    setProgress(0);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // First and only context creation — pass willReadFrequently up front so
    // the browser opts into a CPU-backed bitmap for cheap getImageData().
    ctxRef.current = canvas.getContext("2d", { willReadFrequently: true });
    paintCover();
    window.addEventListener("resize", paintCover);
    return () => {
      window.removeEventListener("resize", paintCover);
      if (revealTimer.current) clearTimeout(revealTimer.current);
    };
  }, [paintCover]);

  const scratchTo = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || done.current) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = ctxRef.current;
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    // Continuous stroke: connect the previous point to the current one
    // with a thick round line, so fast swipes leave no dotted gaps.
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineWidth = LINE_WIDTH;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    if (last.current) {
      ctx.moveTo(last.current.x, last.current.y);
      ctx.lineTo(x, y);
    } else {
      // Dot for the initial tap (no movement yet).
      ctx.moveTo(x, y);
      ctx.lineTo(x + 0.01, y + 0.01);
    }
    ctx.stroke();
    ctx.restore();
    last.current = { x, y };
  };

  // Runs ONLY on pointerup — getImageData is far too expensive per move.
  const measure = () => {
    const canvas = canvasRef.current;
    if (!canvas || done.current) return;
    const ctx = ctxRef.current;
    if (!ctx) return;
    const step = 24;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let clear = 0;
    let total = 0;
    for (let i = 3; i < data.length; i += 4 * step) {
      total++;
      if (data[i] === 0) clear++;
    }
    const pct = total ? clear / total : 0;
    setProgress(pct);
    if (pct >= REVEAL_AT) {
      done.current = true;
      canvas.style.transition = "opacity 0.5s ease";
      canvas.style.opacity = "0";
      // Stop intercepting pointer events while the fade plays out.
      canvas.style.pointerEvents = "none";
      if (revealTimer.current) clearTimeout(revealTimer.current);
      revealTimer.current = setTimeout(() => setRevealed(true), 350);
    }
  };

  /** Reset the card: restore the foil, interactivity and progress state. */
  const handleReset = () => {
    const canvas = canvasRef.current;
    if (revealTimer.current) {
      clearTimeout(revealTimer.current);
      revealTimer.current = null;
    }
    painting.current = false;
    last.current = null;
    if (canvas) {
      canvas.style.transition = "none";
      canvas.style.opacity = "1";
      canvas.style.pointerEvents = "auto";
    }
    // paintCover() clears done.current / revealed / progress and repaints the
    // foil. The canvas is always mounted, so this always has a valid target.
    paintCover();
  };

  return (
    <section className="bg-maroon-900 py-28">
      <SectionHeading dark eyebrow={SCRATCH.eyebrow} title={SCRATCH.title} sub={SCRATCH.sub} />
      <motion.div
        initial={{ opacity: 0, y: 48 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7 }}
        className="mx-auto mt-12 w-[88%] max-w-sm"
      >
        <div
          ref={wrapRef}
          className="relative aspect-[4/5] select-none overflow-hidden rounded-2xl border-2 border-gold-400 shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
          style={{ touchAction: "pan-y" }}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-cream-50 px-6 text-center">
            <p className="font-script text-4xl text-crimson-600">{SCRATCH.revealKicker}</p>
            <p className="mt-3 font-display text-5xl font-bold tracking-wide text-maroon-900">
              {WEDDING.dateShort}
            </p>
            <p className="mt-2 text-sm font-medium uppercase tracking-[0.25em] text-gold-600">
              {WEDDING.dateLabel}
            </p>
            <p className="mt-3 text-sm text-ink-900/60">
              {WEDDING.venue} · {WEDDING.city}
            </p>
          </div>
          {/* Always mounted: the reset button repaints this exact node, so it
              must never be conditionally unmounted (that would null the ref and
              break reset). Visibility is driven imperatively via style. */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 cursor-crosshair"
            onPointerDown={(e) => {
              painting.current = true;
              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
              last.current = null;
              scratchTo(e.clientX, e.clientY);
            }}
            onPointerMove={(e) => {
              // Draw only — no getImageData here (that freezes mobile).
              if (painting.current) scratchTo(e.clientX, e.clientY);
            }}
            onPointerUp={() => {
              painting.current = false;
              last.current = null;
              // Percentage check runs once per stroke, on finger lift.
              measure();
            }}
            onPointerCancel={() => {
              painting.current = false;
              last.current = null;
            }}
          />
        </div>
        <div className="mt-4 flex items-center justify-between px-1">
          <p className="text-xs uppercase tracking-[0.2em] text-cream-200/70">
            {revealed
              ? SCRATCH.statusRevealed
              : `${SCRATCH.progressPrefix}${Math.round(progress * 100)}${SCRATCH.progressSuffix}`}
          </p>
          <button
            type="button"
            onClick={handleReset}
            className="min-h-[44px] min-w-[44px] rounded-full border border-gold-400/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-gold-300 transition hover:bg-gold-400 hover:text-maroon-950"
          >
            {SCRATCH.resetLabel}
          </button>
        </div>
      </motion.div>
    </section>
  );
}
