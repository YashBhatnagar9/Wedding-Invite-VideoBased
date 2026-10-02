"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface Props {
  eyebrow: string;
  title: ReactNode;
  sub?: string;
  dark?: boolean;
}

/**
 * Reusable section heading — script eyebrow, serif title,
 * gold divider ornament. Set `dark` on maroon backgrounds.
 */
export default function SectionHeading({ eyebrow, title, sub, dark }: Props) {
  return (
    <div className="mx-auto max-w-xl px-6 text-center">
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className={`font-script text-4xl ${dark ? "text-gold-300" : "text-crimson-600"}`}
      >
        {eyebrow}
      </motion.p>
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, delay: 0.08 }}
        className={`mt-2 font-display text-5xl font-semibold leading-tight ${
          dark ? "text-cream-50" : "text-maroon-900"
        }`}
      >
        {title}
      </motion.h2>
      {/* Gold divider */}
      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.15 }}
        className="mx-auto mt-5 flex items-center justify-center gap-2"
        aria-hidden
      >
        <span className="h-px w-14 bg-gradient-to-r from-transparent to-gold-500" />
        <span className="text-gold-500">❋</span>
        <span className="h-px w-14 bg-gradient-to-l from-transparent to-gold-500" />
      </motion.div>
      {sub && (
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className={`mt-4 text-[15px] leading-relaxed ${
            dark ? "text-cream-200/90" : "text-ink-900/70"
          }`}
        >
          {sub}
        </motion.p>
      )}
    </div>
  );
}
