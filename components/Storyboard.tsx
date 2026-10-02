"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import SectionHeading from "./SectionHeading";
import { STORY, STORY_MOMENTS, WEDDING } from "@/lib/wedding";

/**
 * STORYBOARD — vertical timeline of Polaroid-style cards.
 * Each card fades + slides in on scroll with a slight alternating tilt.
 * The couple's caricature headlines the section in a taped Polaroid frame.
 */
const TILTS = ["-rotate-2", "rotate-2", "-rotate-1", "rotate-1"];

export default function Storyboard() {
  return (
    <section className="relative overflow-hidden bg-cream-100 py-28">
      {/* faint paisley-dot texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: "radial-gradient(#5c0e14 1.2px, transparent 1.2px)",
          backgroundSize: "22px 22px",
        }}
      />
      <SectionHeading eyebrow={STORY.eyebrow} title={STORY.title} sub={STORY.sub} />

      {/* Caricature Polaroid */}
      <motion.figure
        initial={{ opacity: 0, y: 60, rotate: -4 }}
        whileInView={{ opacity: 1, y: 0, rotate: -2 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative mx-auto mt-12 w-[86%] max-w-sm rounded-md bg-white p-3 pb-5 shadow-[0_18px_50px_rgba(62,10,15,0.25)]"
      >
        {/* washi-tape corners */}
        <span
          aria-hidden
          className="absolute -top-3 left-6 h-7 w-20 -rotate-6 bg-gold-300/70 shadow-sm"
        />
        <span
          aria-hidden
          className="absolute -top-3 right-6 h-7 w-20 rotate-6 bg-gold-300/70 shadow-sm"
        />
        <div className="relative overflow-hidden rounded-sm">
          <Image
            src={WEDDING.caricatureSrc}
            alt={WEDDING.caricatureAlt}
            width={640}
            height={640}
            sizes="(max-width: 430px) 86vw, 384px"
            className="h-auto w-full object-cover"
            priority={false}
            decoding="async"
          />
        </div>
        <figcaption className="pt-3 text-center">
          <span className="font-script text-3xl text-maroon-800">{STORY.caption}</span>
        </figcaption>
      </motion.figure>

      {/* Couple intro — formal "Meet the Bride and Groom" cards.
          Caricature polaroid stays untouched; individual names follow
          with parent introductions from the WEDDING config. */}
      <div className="mx-auto mt-12 grid w-[86%] max-w-sm auto-rows-fr grid-cols-1 gap-6">
        {[
          {
            name: WEDDING.brideName,
            label: WEDDING.brideParentsLabel,
            parents: WEDDING.brideParents,
          },
          {
            name: WEDDING.groomName,
            label: WEDDING.groomParentsLabel,
            parents: WEDDING.groomParents,
          },
        ].map(({ name, label, parents }) => {
          const [mother, father] = parents.split(/\s*&\s*/);
          return (
            <div
              key={name}
              className="flex h-full w-full flex-col items-center rounded-md bg-white p-4 pb-5 text-center shadow-[0_14px_36px_rgba(62,10,15,0.18)]"
            >
              <p className="text-center font-script text-4xl leading-none text-maroon-900">{name}</p>
              <p className="mx-auto mt-2 w-full text-center font-sans text-sm leading-relaxed text-maroon-800/80">
                {label}
                <br />
                {mother}
                <br />
                {WEDDING.inviteAmpersand}{"\u00a0"}{father?.replace(/^Mr\.\s+/, "Mr.\u00a0")}
              </p>
            </div>
          );
        })}
      </div>

      {/* Timeline — single column, centred inside the 430px phone frame */}
      <div className="relative mx-auto mt-16 max-w-md px-6">
        {/* spine */}
        <span
          aria-hidden
          className="absolute bottom-4 left-1/2 top-0 w-px -translate-x-1/2 bg-gradient-to-b from-gold-500/70 via-crimson-600/40 to-gold-500/70"
        />
        <ol className="space-y-10">
          {STORY_MOMENTS.map((m, i) => (
            <motion.li
              key={m.year}
              initial={{ opacity: 0, y: 56 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.65, delay: 0.05, ease: "easeOut" }}
              className="relative"
            >
              <div
                className={`rounded-md bg-white p-4 pb-6 shadow-[0_14px_36px_rgba(62,10,15,0.18)] transition-transform ${TILTS[i % TILTS.length]}`}
              >
                <p className="font-script text-2xl leading-none text-crimson-600">{m.year}</p>
                <h3 className="mt-1 font-display text-2xl font-semibold text-maroon-900">
                  {m.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-900/70">{m.text}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
