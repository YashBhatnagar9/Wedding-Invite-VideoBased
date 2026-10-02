"use client";

import { motion } from "framer-motion";
import SectionHeading from "./SectionHeading";
import { ITINERARY, ITINERARY_COPY, WEDDING } from "@/lib/wedding";

/**
 * ITINERARY — evening timeline + "Add to Calendar" (.ics download).
 * The .ics file is generated entirely client-side as a Blob, so it works
 * offline and on slow 3G with zero backend.
 */
export default function Itinerary() {
  /** Build and download a minimal iCalendar file for the event. */
  const downloadIcs = () => {
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      `PRODID:${ITINERARY_COPY.icsProdId}`,
      "BEGIN:VEVENT",
      `UID:${Date.now()}${ITINERARY_COPY.icsUidSuffix}`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
      `DTSTART:${WEDDING.icsStart}`,
      `DTEND:${WEDDING.icsEnd}`,
      `SUMMARY:${ITINERARY_COPY.icsSummaryPrefix}${WEDDING.coupleNames} — ${WEDDING.dateLabel}`,
      `LOCATION:${WEDDING.venue}\\, ${WEDDING.city}`,
      `DESCRIPTION:${ITINERARY_COPY.icsDescription}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([lines], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = ITINERARY_COPY.icsFilename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="bg-cream-50 py-28">
      <SectionHeading
        eyebrow={ITINERARY_COPY.eyebrow}
        title={ITINERARY_COPY.title}
        sub={`${WEDDING.dateLabel} · ${WEDDING.venue}, ${WEDDING.city}`}
      />

      <div className="relative mx-auto mt-14 max-w-md px-6">
        {/* gold spine */}
        <span
          aria-hidden
          className="absolute bottom-6 left-[37px] top-2 w-[2px] bg-gradient-to-b from-gold-300 via-gold-500 to-crimson-600"
        />
        <ol className="space-y-8">
          {ITINERARY.map((item, i) => (
            <motion.li
              key={item.name}
              initial={{ opacity: 0, x: -32 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: i * 0.06 }}
              className="relative flex gap-5"
            >
              {/* time medallion — short label only, wraps safely */}
              <div className="z-10 flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full border border-gold-500 bg-maroon-800 px-1 text-center shadow-md">
                <span className="text-[11px] font-bold leading-none text-gold-300">
                  {(item.label ?? item.time).split(" ")[0]}
                </span>
                <span className="text-[9px] font-semibold uppercase tracking-wider text-cream-200">
                  {(item.label ?? item.time).split(" ")[1]}
                </span>
              </div>
              <div className="min-w-0 flex-1 rounded-xl border border-gold-500/30 bg-white/80 p-4 shadow-sm">
                <p className="break-words text-[11px] font-semibold uppercase tracking-[0.25em] text-gold-600">
                  {item.date}
                </p>
                <h3 className="mt-0.5 font-display text-2xl font-semibold text-maroon-900">
                  {item.name}
                </h3>
                <p className="mt-1 break-words text-sm leading-relaxed text-ink-900/70">
                  {item.time} · {item.venue}
                </p>
              </div>
            </motion.li>
          ))}
        </ol>

        {/* Add to Calendar + Get Directions */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-12 text-center"
        >
          <div className="flex flex-col items-center gap-3 my-4 w-full relative z-10">
            <button
              type="button"
              onClick={downloadIcs}
              className="group inline-flex items-center justify-center gap-2.5 whitespace-nowrap rounded-full bg-maroon-800 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gold-300 shadow-[0_8px_20px_rgba(62,10,15,0.35)] transition hover:bg-maroon-700 active:scale-95 w-56 sm:w-60"
            >
              <span aria-hidden className="text-base transition group-hover:scale-125">
                {ITINERARY_COPY.calendarIcon}
              </span>
              {ITINERARY_COPY.addToCalendar}
            </button>

            <p className="text-[11px] text-ink-900/70">
              {ITINERARY_COPY.calendarNotePrefix}
              <code>{ITINERARY_COPY.calendarNoteCode}</code>
              {ITINERARY_COPY.calendarNoteSuffix}
            </p>

            <a
              href={WEDDING.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center justify-center gap-2.5 whitespace-nowrap rounded-full bg-maroon-800 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gold-300 shadow-[0_8px_20px_rgba(62,10,15,0.35)] transition hover:bg-maroon-700 active:scale-95 w-56 sm:w-60"
            >
              <span aria-hidden className="text-base transition group-hover:scale-125">
                {ITINERARY_COPY.mapIcon}
              </span>
              {ITINERARY_COPY.getDirections}
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
