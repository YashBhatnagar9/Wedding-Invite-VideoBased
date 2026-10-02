// ============================================================
// lib/wedding.ts — THE ONLY file where website content lives.
// Edit values here to personalise the invitation. No copy should
// be hardcoded inside React components — everything pulls from
// the exports below.
// ============================================================

// --- Browser tab / SEO ---
export const SITE = {
  title: "You're Invited — Wedding Celebration",
  description:
    "A royal digital wedding invitation — scroll to open the envelope, explore our story, and RSVP.",
} as const;

// --- Core wedding facts + asset paths ---
export const WEDDING = {
  brideName: "Rajni",
  groomName: "Yash",
  coupleNames: "Rajni & Yash",
  coupleLine: "Two Souls, One Celebration",
  // Vertical invite card copy (matches weddingContent.ts reference).
  inviteEyebrow: "INVITE",
  familyPre: "You to join us in the wedding celebrations of",
  groomParentsLabel: "Son of",
  groomParents: "Mrs. Reeta Bhatnagar & Mr. Ashok Kumar Bhatnagar",
  inviteAmpersand: "&",
  brideParentsLabel: "Daughter of",
  brideParents: "Mrs. Hema Shrivastava & Mr. Jogender Prasad Shrivastava",
  blessingsEyebrow: "With the heavenly blessings of",
  blessings: ["Smt. Sita Devi & Sm. Om Puri", "Mrs. Lata & Mr. Kishore Kapoor"],
  invitedByLabel: "Invited by",
  dateLabel: "30 November 2026",
  dateShort: "30 . 11 . 2026",
  rsvpDeadline: "30 October 2026",
  venue: "MB Greens Clarks Inn",
  city: "Moradabad, Uttar Pradesh",
  // Google Maps deep link for the venue — powers the "Get Directions" CTA.
  mapUrl: "https://www.google.com/maps/search/?api=1&query=MB+Greens+Clarks+Inn+Moradabad",
  // Local (floating) times used for the .ics file — no timezone conversion.
  // Matches displayed date: 30 November 2026.
  icsStart: "20261130T180000",
  icsEnd: "20261130T230000",
  caricatureSrc: "/caricature.webp",
  caricatureAlt: "Caricature of the couple",
} as const;

export type RsvpSide = "Bride" | "Groom" | "Both";
export type RsvpAttending = "yes" | "no";

// --- 1. Hero (canvas image-sequence scrub) ---
export const HERO = {
  title: "You're Invited",
  scrollHint: "Scroll to open",
  scrollIcon: "▾",
  finaleHint: "Keep scrolling for our story",
  loadingLabel: "Preparing your invitation…",
  frameAlt: "Wedding invitation envelope opening animation",
  ganeshaSrc: "/ganesha.webp",
  ganeshaAlt: "Shree Ganesha",
  ganeshaInvocation: "ॐ श्री गणेशाय नमः",
} as const;

/**
 * Image-sequence config for the Hero canvas scrub.
 * Frames live in `public/hero-sequence/` as frame_001.webp … frame_240.webp.
 * Adjust `frameCount` if you add/remove frames — everything else follows.
 */
export const HERO_SEQUENCE = {
  dir: "/hero-sequence",
  frameCount: 240,
  padLength: 3,
  prefix: "frame_",
  extension: "webp",
} as const;

/** Converts a zero-based sequence index to a one-based asset filename. */
export function heroFrameUrl(index: number): string {
  const frameNum = String(index + 1).padStart(HERO_SEQUENCE.padLength, "0");
  return `${HERO_SEQUENCE.dir}/${HERO_SEQUENCE.prefix}${frameNum}.${HERO_SEQUENCE.extension}`;
}

// --- 2. Storyboard ---
export const STORY = {
  eyebrow: "Our History",
  title: "The Storyboard",
  sub: "Every love story is beautiful — scroll through the little moments that led to our big day.",
  caption: "Us, in a nutshell ♡",
} as const;

export interface TimelineMoment {
  year: string;
  title: string;
  text: string;
}

// EDIT: replace with the couple's real milestones.
export const STORY_MOMENTS: TimelineMoment[] = [
  {
    year: "October 2025",
    title: "The First Hello",
    text: "A chance meeting through the traditional matrimony app — a conversation neither of them wanted to end.",
  },
  {
    year: "January 2026",
    title: "Miles Apart, Close at Heart",
    text: "Late-night calls and different timezones turned distance into devotion.",
  },
  {
    year: "May 2026",
    title: "The Question",
    text: "A ring, a promise, and a joyful yes.",
  },
  {
    year: "November 2026",
    title: "Forever Begins",
    text: "And now, surrounded by everyone they love, they write their next chapter.",
  },
];

// --- 3. Scratch-to-reveal date card ---
export const SCRATCH = {
  eyebrow: "Save the Date",
  title: "A Little Mystery",
  sub: "Something shimmers beneath the gold… scratch the card to reveal when we celebrate.",
  foilTitle: "✦ SCRATCH TO REVEAL ✦",
  foilHint: "swipe with your finger",
  revealKicker: "We can't wait to see you",
  statusRevealed: "Revealed ✦",
  progressPrefix: "Scratched ",
  progressSuffix: "%",
  resetLabel: "Reset",
} as const;

// --- 4. Itinerary + Add to Calendar ---
export const ITINERARY_COPY = {
  eyebrow: "The Celebration",
  title: "Event Itinerary",
  addToCalendar: "Add to Calendar",
  calendarIcon: "📅",
  getDirections: "Get Directions",
  mapIcon: "📍",
  calendarNotePrefix: "Downloads a ",
  calendarNoteCode: ".ics",
  calendarNoteSuffix: " file that works with Google, Apple & Outlook calendars.",
  icsProdId: "-//WeddingInvite//Celebration//EN",
  icsFilename: "wedding-celebration.ics",
  icsSummaryPrefix: "Wedding Celebration — ",
  icsDescription: "You are cordially invited to celebrate with us!",
  icsUidSuffix: "@wedding-invite",
} as const;

export interface ItineraryItem {
  name: string;
  date: string;
  time: string;
  venue: string;
  /** Legacy short label (e.g. "6:00 PM") — kept optional for the medallion. */
  label?: string;
  title: string;
  detail: string;
}

const VENUE = "MB Greens Clarks Inn, Moradabad";

// Authored in chronological order — this array IS the render order
// (Itinerary.tsx maps it sequentially), and Countdown.tsx advertises
// ITINERARY[0] as the kickoff, so keep this sorted and keep
// COUNTDOWN.targetIso in sync with [0].
export const ITINERARY: ItineraryItem[] = [
  {
    name: "Tilak",
    date: "Sunday, Nov 29, 2026",
    time: "11:00 AM",
    venue: VENUE,
    label: "11:00 AM",
    title: "Tilak",
    detail: "Sunday, Nov 29, 2026 · 11:00 AM · MB Greens Clarks Inn, Moradabad",
  },
  {
    name: "Haldi",
    date: "Sunday, Nov 29, 2026",
    time: "1:00 PM",
    venue: VENUE,
    label: "1:00 PM",
    title: "Haldi",
    detail: "Sunday, Nov 29, 2026 · 1:00 PM · MB Greens Clarks Inn, Moradabad",
  },
  {
    name: "Mehendi",
    date: "Sunday, Nov 29, 2026",
    time: "4:00 PM",
    venue: VENUE,
    label: "4:00 PM",
    title: "Mehendi",
    detail: "Sunday, Nov 29, 2026 · 4:00 PM · MB Greens Clarks Inn, Moradabad",
  },
  {
    name: "Cocktail",
    date: "Sunday, Nov 29, 2026",
    time: "6:00 PM",
    venue: VENUE,
    label: "6:00 PM",
    title: "Cocktail",
    detail: "Sunday, Nov 29, 2026 · 6:00 PM · MB Greens Clarks Inn, Moradabad",
  },
  {
    name: "Wedding",
    date: "Monday, Nov 30, 2026",
    time: "8:00 PM",
    venue: VENUE,
    label: "8:00 PM",
    title: "Wedding",
    detail: "Monday, Nov 30, 2026 · 8:00 PM · MB Greens Clarks Inn, Moradabad",
  },
  {
    name: "Vidai",
    date: "Tuesday, Dec 1, 2026",
    time: "4:00 AM",
    venue: VENUE,
    label: "4:00 AM",
    title: "Vidai",
    detail: "Tuesday, Dec 1, 2026 · 4:00 AM · MB Greens Clarks Inn, Moradabad",
  },
];

// --- 5. Countdown (live timer to the first celebration) ---
export const COUNTDOWN = {
  eyebrow: "The countdown begins",
  title: "Until We Celebrate",
  // First event kick-off: Tilak, 11:00 AM IST, Nov 29 2026 — must match ITINERARY[0].
  targetIso: "2026-11-29T11:00:00+05:30",
  daysLabel: "Days",
  hoursLabel: "Hours",
  minutesLabel: "Minutes",
  secondsLabel: "Seconds",
  liveLabel: "The celebrations have begun — see you there!",
} as const;

// --- 6. RSVP & wishes form ---
export interface RsvpSideOption {
  value: RsvpSide;
  label: string;
}

export const RSVP_SIDE_OPTIONS: RsvpSideOption[] = [
  { value: "Bride", label: "Bride's side" },
  { value: "Groom", label: "Groom's side" },
  { value: "Both", label: "Both — friends of the couple" },
];

export interface RsvpAttendOption {
  value: RsvpAttending;
  label: string;
}

export const RSVP_ATTEND_OPTIONS: RsvpAttendOption[] = [
  { value: "yes", label: "Yes, Joyfully" },
  { value: "no", label: "No, Regretfully" },
];

export const RSVP = {
  eyebrow: "Let us know",
  title: "RSVP",
  subPrefix: "Kindly respond by ",
  subSuffix: " — we can't wait to celebrate with you.",
  nameLabel: "Full Name",
  namePlaceholder: "e.g. Priya Sharma",
  sideLabel: "Which side?",
  sidePlaceholder: "Select a side…",
  attendingLabel: "Attending?",
  wishLabel: "Wishes for the couple",
  wishOptionalTag: "Optional",
  wishPlaceholder: "Share your love and blessings…",
  errorMessage: "Something went wrong — please try again.",
  submitLabel: "Send RSVP ✦",
  sendingLabel: "Sending…",
  thanksIcon: "💌",
  thanksTitle: "Thank you!",
  thanksPrefix: "Thank you,",
  thanksMessage:
    "Your response has been received with love. We can't wait to celebrate together on the big day.",
} as const;

// --- Footer ---
export const FOOTER = {
  title: "With love & blessings",
  sub: "We can't wait to celebrate with you",
} as const;
