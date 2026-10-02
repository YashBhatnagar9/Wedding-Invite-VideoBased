import { useEffect, useRef, useState, type RefObject } from "react";

interface UseImageSequenceOptions {
  /** Ref that receives the decoded frames, indexed by frame number. */
  framesRef: RefObject<(HTMLImageElement | undefined)[]>;
  /** Builds the URL for a given 0-based frame index. */
  srcFor: (index: number) => string;
  /** Total number of frames in the sequence. */
  frameCount: number;
  /** Frames loaded eagerly with high priority. Defaults to 16. */
  eagerCount?: number;
  /** Frames loaded per idle chunk. Defaults to 12. */
  chunkSize?: number;
  /**
   * Called after every frame settles. `index` is the frame index, or -1 on
   * error; `frames` is the live frame array.
   */
  onFrameLoaded?: (index: number, frames: (HTMLImageElement | undefined)[]) => void;
}

interface UseImageSequenceResult {
  /** Number of frames that have settled (loaded or errored). */
  loaded: number;
}

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

/**
 * Preloads a scroll-scrubbed image sequence.
 *
 * The first `eagerCount` frames are fetched immediately with high priority so
 * the hero paints on first render; the remainder stream in during idle time in
 * `chunkSize` batches so the main thread never blocks constructing N Image
 * objects at once. Every timer/idle callback is cancelled and the frame array
 * released on unmount so mobile can reclaim the decoded bitmaps.
 */
export function useImageSequence({
  framesRef,
  srcFor,
  frameCount,
  eagerCount = 16,
  chunkSize = 12,
  onFrameLoaded,
}: UseImageSequenceOptions): UseImageSequenceResult {
  const [loaded, setLoaded] = useState(0);

  // Latest values without re-running the (expensive) preload effect.
  const srcForRef = useRef(srcFor);
  const onFrameLoadedRef = useRef(onFrameLoaded);
  useEffect(() => {
    srcForRef.current = srcFor;
    onFrameLoadedRef.current = onFrameLoaded;
  });

  useEffect(() => {
    let cancelled = false;
    const images = new Set<HTMLImageElement>();
    const w = window as IdleWindow;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let idleId: number | null = null;
    let settled = 0;
    framesRef.current = new Array(frameCount);

    const loadOne = (i: number, highPriority: boolean) => {
      const img = new Image();
      images.add(img);
      img.decoding = "async";
      if (highPriority) img.fetchPriority = "high";
      img.onload = () => {
        img.onload = null;
        img.onerror = null;
        if (cancelled) return;
        framesRef.current[i] = img;
        setLoaded(++settled);
        onFrameLoadedRef.current?.(i, framesRef.current);
      };
      img.onerror = () => {
        img.onload = null;
        img.onerror = null;
        images.delete(img);
        if (cancelled) return;
        setLoaded(++settled);
        onFrameLoadedRef.current?.(-1, framesRef.current);
      };
      img.src = srcForRef.current(i);
    };

    // 1) Critical frames: fetched immediately, high priority.
    const eager = Math.min(eagerCount, frameCount);
    for (let i = 0; i < eager; i++) loadOne(i, true);

    // 2) Remaining frames: background chunks via requestIdleCallback (falls
    // back to staggered setTimeout where unsupported).
    const schedule = (cb: () => void) => {
      if (typeof w.requestIdleCallback === "function" &&
          typeof w.cancelIdleCallback === "function") {
        idleId = w.requestIdleCallback(() => {
          idleId = null;
          cb();
        }, { timeout: 1500 });
      } else {
        timer = setTimeout(() => {
          timer = null;
          cb();
        }, 120);
      }
    };

    let next = eager;
    const pump = () => {
      if (cancelled) return;
      for (let k = 0; k < chunkSize && next < frameCount; k++, next++) {
        loadOne(next, false);
      }
      if (next < frameCount) {
        schedule(pump);
      }
    };
    if (next < frameCount) {
      schedule(pump);
    }

    return () => {
      cancelled = true;
      if (timer !== null) clearTimeout(timer);
      if (idleId !== null) w.cancelIdleCallback?.(idleId);
      // Detach callbacks before abandoning both in-flight and decoded images.
      images.forEach((img) => {
        img.onload = null;
        img.onerror = null;
        img.removeAttribute("src");
      });
      images.clear();
      // Dereference decoded bitmaps so mobile can reclaim RAM on unmount.
      framesRef.current = [];
    };
  }, [framesRef, frameCount, eagerCount, chunkSize]);

  return { loaded };
}
