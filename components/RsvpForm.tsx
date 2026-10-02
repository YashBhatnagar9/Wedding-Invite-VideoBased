"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RSVP, RSVP_ATTEND_OPTIONS, RSVP_SIDE_OPTIONS } from "@/lib/wedding";
import type { RsvpAttending, RsvpSide } from "@/lib/wedding";

/* RSVP form — Full Name + side + attending + optional wishes.
   POSTs JSON to /api/rsvp; success unmounts inputs for a thank-you. */
export default function RsvpForm() {
  const [name, setName] = useState("");
  const [side, setSide] = useState<RsvpSide | "">("");
  const [attending, setAttending] = useState<RsvpAttending | "">("");
  const [wish, setWish] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const valid = name.trim().length > 1 && side !== "" && attending !== "";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || isSubmitting) return;
    setIsSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), side, attending, wish: wish.trim() }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!res.ok || !data?.ok) throw new Error(data?.error || "bad response");
      setIsSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error && err.message !== "bad response" ? err.message : RSVP.errorMessage
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldCls =
    "w-full rounded-xl border border-gold-500/40 bg-white/90 px-4 py-3 text-[15px] text-ink-900 placeholder:text-ink-900/35 outline-none transition focus:border-gold-500 focus:ring-2 focus:ring-gold-400/40";
  const labelCls = "mb-1.5 block text-xs font-semibold uppercase tracking-[0.2em] text-cream-50";

  return (
    <div className="mx-auto mt-12 w-[90%] max-w-md rounded-2xl border border-gold-500/40 bg-[#2b0609] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
      <AnimatePresence mode="wait">
        {isSuccess ? (
          <motion.div
            key="thanks"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-8 text-center"
          >
            <p className="text-5xl" aria-hidden>
              {RSVP.thanksIcon}
            </p>
            <p className="mt-4 font-display text-4xl font-semibold text-cream-50">
              {RSVP.thanksTitle}
            </p>
            <p className="mt-1 font-script text-3xl text-gold-300">
              {RSVP.thanksPrefix} {name.trim()}!
            </p>
            <p className="mt-3 text-sm leading-relaxed text-cream-50/70">{RSVP.thanksMessage}</p>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            exit={{ opacity: 0, scale: 0.96 }}
            onSubmit={submit}
            className="space-y-5"
          >
            <div>
              <label htmlFor="rsvp-name" className={labelCls}>
                {RSVP.nameLabel}
              </label>
              <input
                id="rsvp-name"
                type="text"
                autoComplete="name"
                placeholder={RSVP.namePlaceholder}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={fieldCls}
              />
            </div>
            <div>
              <label htmlFor="rsvp-side" className={labelCls}>
                {RSVP.sideLabel}
              </label>
              <select
                id="rsvp-side"
                value={side}
                onChange={(e) => setSide(e.target.value as RsvpSide)}
                className={`${fieldCls} ${side === "" ? "text-ink-900/35" : ""}`}
              >
                <option value="" disabled>
                  {RSVP.sidePlaceholder}
                </option>
                {RSVP_SIDE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <fieldset>
              <legend className={labelCls}>{RSVP.attendingLabel}</legend>
              <div className="grid grid-cols-2 gap-3">
                {RSVP_ATTEND_OPTIONS.map((opt) => {
                  const active = attending === opt.value;
                  return (
                    <label
                      key={opt.value}
                      className={`flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-center text-sm font-semibold transition ${
                        active
                          ? "border-gold-400 bg-gold-400 text-maroon-950 shadow-[0_8px_20px_rgba(201,162,39,0.35)]"
                          : "border-gold-500/40 bg-white/90 text-ink-900 hover:border-gold-500"
                      }`}
                    >
                      <input
                        type="radio"
                        name="rsvp-attending"
                        value={opt.value}
                        checked={active}
                        onChange={() => setAttending(opt.value)}
                        className="sr-only"
                      />
                      <span aria-hidden>{opt.value === "yes" ? "✦" : "✧"}</span>
                      {opt.label}
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <div>
              <label htmlFor="rsvp-wish" className={labelCls}>
                {RSVP.wishLabel}{" "}
                <span className="font-normal normal-case tracking-normal text-cream-50/50">
                  ({RSVP.wishOptionalTag})
                </span>
              </label>
              <textarea
                id="rsvp-wish"
                rows={4}
                placeholder={RSVP.wishPlaceholder}
                value={wish}
                onChange={(e) => setWish(e.target.value)}
                className={`${fieldCls} resize-none`}
              />
            </div>
            {error && (
              <p className="rounded-lg bg-crimson-600/20 px-3 py-2 text-center text-sm text-cream-50">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={!valid || isSubmitting}
              className="min-h-[44px] w-full rounded-full bg-gradient-to-r from-maroon-800 via-crimson-600 to-maroon-800 bg-[length:200%_auto] px-8 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-gold-300 shadow-[0_12px_30px_rgba(0,0,0,0.5)] transition hover:bg-right active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? RSVP.sendingLabel : RSVP.submitLabel}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
