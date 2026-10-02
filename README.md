# 💌 Wedding Invite

A royal, mobile-first digital wedding invitation built with **Next.js (App Router)**,
React 19, Tailwind CSS v4 and Framer Motion. Scroll to open the envelope, explore the
storyboard, scratch to reveal the date, and RSVP — everything is driven by a single
config file.

## Features

- **Hero canvas scrub** — a 240-frame WebP image sequence scrubbed by scroll (eager
  first frames + idle-streamed remainder), decoded on a cached 2D canvas.
- **Storyboard** — polaroid timeline with the couple's caricature.
- **Scratch card** — canvas foil you scratch to reveal the date, with a reset button.
- **Itinerary** — celebration timeline + client-side `.ics` "Add to Calendar".
- **Countdown** — live timer that only ticks while on screen.
- **RSVP** — validated with Zod and forwarded to a Google Sheets webhook.
- **Music player** — floating background-music toggle, unlocked on first gesture.

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev                  # http://localhost:3000
```

## Environment variables

| Variable                    | Required | Description                                                                                                                                |
| --------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `GOOGLE_SHEETS_WEBHOOK_URL` | No       | Google Apps Script Web App URL that receives RSVP POSTs. If unset, `/api/rsvp` acknowledges locally so the UI still works in development.  |
| `NEXT_PUBLIC_SITE_URL`      | No       | Absolute base URL of the deployed site. Used for OG/Twitter image URLs and to satisfy `metadataBase`. Defaults to `http://localhost:3000`. |

## Scripts

| Script                   | Description                                                   |
| ------------------------ | ------------------------------------------------------------- |
| `npm run dev`            | Start the dev server (Turbopack).                             |
| `npm run build`          | Production build.                                             |
| `npm run start`          | Serve the production build.                                   |
| `npm run lint`           | Lint with ESLint (flat config, `eslint-config-next`).         |
| `npm run format`         | Format the repo with Prettier.                                |
| `npm run sharpen:frames` | Batch-sharpen the hero sequence into `public/hero-sharpened`. |

## Project structure

```
app/                 App Router: layout, page, /api/rsvp route
components/          UI sections (Hero, Storyboard, ScratchCard, Countdown, …)
hooks/               useCanvasFit, useImageSequence
lib/wedding.ts       ALL site content & configuration (single source of truth)
lib/rsvp/schema.ts   Zod schema + spreadsheet-injection sanitiser
scripts/             Frame sharpening + song generation utilities
public/              Static assets (hero sequence, music, caricature)
```

To personalise the invitation, edit **`lib/wedding.ts`** — no copy is hardcoded in
components.

## RSVP webhook (Google Sheets)

1. Create a Google Sheet and open **Extensions → Apps Script**.
2. Add a `doPost(e)` handler that appends `JSON.parse(e.postData.contents)` as a row.
3. Deploy it as a **Web App** (access: _Anyone_), then copy the `/exec` URL into
   `GOOGLE_SHEETS_WEBHOOK_URL`.

The route rejects oversized payloads (413), validates with Zod (400), and sanitises
`name`/`wish` against spreadsheet formula injection before forwarding.

## Deployment

Any Node host works (Vercel recommended):

1. Push the repo and import it into Vercel.
2. Set `GOOGLE_SHEETS_WEBHOOK_URL` and `NEXT_PUBLIC_SITE_URL` in project env vars.
3. Deploy — the page is statically prerendered; `/api/rsvp` runs on demand.

## Asset pipeline

- **Hero frames**: `npm run sharpen:frames` writes sharpened copies to
  `public/hero-sharpened`. Review them, then swap that directory over
  `public/hero-sequence` (no config change needed). Frame count lives in
  `HERO_SEQUENCE.frameCount` in `lib/wedding.ts`.
- **Music**: `python scripts/gen-wedding-song.py` regenerates
  `public/wedding-song.mp3` (requires `numpy` and `lameenc`).
