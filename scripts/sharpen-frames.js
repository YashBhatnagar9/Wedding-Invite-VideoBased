#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * scripts/sharpen-frames.js
 * ---------------------------------------------------------------------------
 * Batch-sharpens the Hero canvas image sequence.
 *
 *   public/hero-sequence/000.webp … 239.webp   (source)
 *                    ↓  sharpen + re-encode WebP
 *   public/hero-sharpened/000.webp … 239.webp  (output)
 *
 * Why: the frames are scrubbed at 60fps on a phone, where heavy cover-fit
 * downscaling + WebP decode softens edges. A strong unsharp mask baked into
 * the source pixels survives that downscale far better than the browser's
 * runtime resampling, so the envelope reveal stays crisp while scrolling.
 *
 * Pipeline per frame:
 *   sharp(input)
 *     .sharpen({ sigma: 1.2, m1: 1.5, m2: 2.5 })   // aggressive unsharp mask
 *     .webp({ quality: 85, smartSubsample: true }) // no chroma bleed on edges
 *     .toFile(output)
 *
 * Usage:
 *   node scripts/sharpen-frames.js                 # process all frames
 *   node scripts/sharpen-frames.js --limit 3       # smoke-test 3 frames
 *   node scripts/sharpen-frames.js --force         # redo existing outputs
 *   node scripts/sharpen-frames.js --concurrency 4 # parallel jobs (default 4)
 *   node scripts/sharpen-frames.js --quality 90 --sigma 1.4
 *
 * The frame list is discovered from disk (not hardcoded), so it stays correct
 * if frames are added or removed later.
 * ---------------------------------------------------------------------------
 */

"use strict";

const fs = require("fs");
const path = require("path");

// --- sharp (declared in devDependencies; friendly failure if missing) -------
let sharp;
try {
  sharp = require("sharp");
} catch {
  console.error("\n✖ Could not load `sharp`.\n  Install it first:  npm i -D sharp\n");
  process.exit(1);
}

// --- CLI parsing ------------------------------------------------------------
const argv = process.argv.slice(2);

/** Read `--flag value` or `--flag=value`; undefined when absent. */
function arg(name) {
  const eq = argv.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.slice(name.length + 3);
  const i = argv.indexOf(`--${name}`);
  if (i !== -1 && argv[i + 1] && !argv[i + 1].startsWith("--")) return argv[i + 1];
  return i !== -1 ? "true" : undefined;
}

const hasFlag = (name) => argv.includes(`--${name}`) || arg(name) === "true";

const num = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const ROOT = path.resolve(__dirname, "..");
const SRC_DIR = path.resolve(ROOT, arg("src") || "public/hero-sequence");
const OUT_DIR = path.resolve(ROOT, arg("out") || "public/hero-sharpened");

const LIMIT = hasFlag("limit") ? num(arg("limit"), Infinity) : Infinity;
const FORCE = hasFlag("force");
const CONCURRENCY = Math.max(1, Math.min(8, num(arg("concurrency"), 4)));
const QUALITY = Math.max(1, Math.min(100, num(arg("quality"), 85)));

// Unsharp-mask tuning (px sigma + edge thresholds). Overridable for experiments.
const SHARPEN = {
  sigma: num(arg("sigma"), 1.2),
  m1: num(arg("m1"), 1.5),
  m2: num(arg("m2"), 2.5),
};

// --- helpers ----------------------------------------------------------------
const mb = (bytes) => `${(bytes / 1048576).toFixed(1)} MB`;
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

/** Numeric-aware sort so frame_2 sorts before frame_10. */
function byFrameNumber(a, b) {
  const n = (s) => {
    const m = s.match(/(\d+)(?=\.[^.]+$)/);
    return m ? Number(m[1]) : Number.POSITIVE_INFINITY;
  };
  return n(a) - n(b) || a.localeCompare(b);
}

const timer = () => {
  const start = Date.now();
  return () => Date.now() - start;
};

/** Run `worker` over `items` with a bounded pool (libvips already threads). */
async function pool(items, concurrency, worker) {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      await worker(items[i], i);
    }
  });
  await Promise.all(runners);
}

// --- main -------------------------------------------------------------------
async function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error(`\n✖ Source directory not found: ${SRC_DIR}\n`);
    process.exit(1);
  }

  const all = fs
    .readdirSync(SRC_DIR)
    .filter((f) => /\.webp$/i.test(f))
    .sort(byFrameNumber);

  if (all.length === 0) {
    console.error(`\n✖ No .webp frames found in ${SRC_DIR}\n`);
    process.exit(1);
  }

  const frames = LIMIT === Infinity ? all : all.slice(0, LIMIT);

  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log("\n✦ Sharpening Hero sequence");
  console.log(`  source       ${SRC_DIR}`);
  console.log(`  output       ${OUT_DIR}`);
  console.log(
    `  frames       ${frames.length} of ${all.length} (${frames[0]} … ${frames[frames.length - 1]})`
  );
  console.log(`  sharpen      sigma ${SHARPEN.sigma}, m1 ${SHARPEN.m1}, m2 ${SHARPEN.m2}`);
  console.log(`  webp         quality ${QUALITY}, smartSubsample true`);
  console.log(
    `  concurrency  ${CONCURRENCY}${FORCE ? ", force (overwriting)" : ", skipping existing"}\n`
  );

  const failures = [];
  let done = 0;
  let skipped = 0;
  let bytesIn = 0;
  let bytesOut = 0;
  let width = 0;
  let height = 0;

  const elapsed = timer();

  await pool(frames, CONCURRENCY, async (file) => {
    const inputPath = path.join(SRC_DIR, file);
    const outputPath = path.join(OUT_DIR, file);

    try {
      if (!FORCE && fs.existsSync(outputPath)) {
        skipped++;
        bytesIn += fs.statSync(inputPath).size;
        bytesOut += fs.statSync(outputPath).size;
      } else {
        await sharp(inputPath)
          .sharpen({ sigma: SHARPEN.sigma, m1: SHARPEN.m1, m2: SHARPEN.m2 })
          .webp({ quality: QUALITY, smartSubsample: true })
          .toFile(outputPath);

        const meta = await sharp(outputPath).metadata();
        width = meta.width || width;
        height = meta.height || height;

        bytesIn += fs.statSync(inputPath).size;
        bytesOut += fs.statSync(outputPath).size;
        done++;
      }

      const seen = done + skipped;
      const pct = Math.round((seen / frames.length) * 100);
      const rate = seen / (elapsed() / 1000);
      process.stdout.write(
        `\r  ${String(pct).padStart(3)}%  ${seen}/${frames.length}` +
          `  (${done} sharpened, ${skipped} skipped)  ${rate.toFixed(1)} fps  ${(
            elapsed() / 1000
          ).toFixed(0)}s`
      );
    } catch (err) {
      failures.push({ file, message: err && err.message ? err.message : String(err) });
      process.stdout.write(`\r  ✖ ${file}: ${err && err.message ? err.message : err}\n`);
    }
  });

  process.stdout.write("\n");

  console.log("\n✦ Done");
  console.log(`  sharpened    ${done}`);
  if (skipped) console.log(`  skipped      ${skipped} (already existed)`);
  if (width && height) console.log(`  dimensions   ${width}×${height}`);
  console.log(
    `  size         ${mb(bytesIn)} → ${mb(bytesOut)} (${kb(bytesOut / frames.length)} avg/frame)`
  );
  console.log(`  time         ${(elapsed() / 1000).toFixed(1)}s`);

  if (failures.length) {
    console.error(`\n✖ ${failures.length} frame(s) failed:`);
    for (const f of failures) console.error(`   - ${f.file}: ${f.message}`);
    process.exit(1);
  }

  // The Hero reads `public/hero-sequence` (HERO_SEQUENCE.dir === "/hero-sequence").
  // This script writes sharpened copies to `public/hero-sharpened` so the
  // originals stay intact. To promote them, swap the directories:
  //   Remove-Item -Recurse -Force public/hero-sequence
  //   Rename-Item public/hero-sharpened hero-sequence
  console.log(
    `\n  Next: review ${path.relative(ROOT, OUT_DIR)}, then swap it over` +
      `\n        public/hero-sequence (no config change needed).\n`
  );
}

main().catch((err) => {
  console.error("\n✖ Unexpected failure:", err);
  process.exit(1);
});
