import { useEffect, useRef, type RefObject } from "react";

export function resolveMaxDpr(): number {
  if (typeof window === "undefined") return 2;
  // Mobile GPUs rasterize huge backing stores slowly; cap slightly below desktop.
  const isMobileViewport = window.innerWidth < 768;
  const cap = isMobileViewport ? 1.75 : 2;
  return Math.min(window.devicePixelRatio || 1, cap);
}

/**
 * Apply the highest-quality image resampling to a 2D canvas context.
 * Call this once whenever a fresh context is acquired; the flags live on the
 * context, not on each draw call.
 */
export function applyHighQualitySmoothing(ctx: CanvasRenderingContext2D | null): void {
  if (!ctx) return;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
}

interface UseCanvasFitOptions {
  /**
   * Cap for devicePixelRatio (memory balance). When omitted, the cap is
   * resolved per viewport: 2.0 on desktop, 1.75 on mobile viewports.
   */
  maxDpr?: number;
  /** Called after the backing store is (re)sized — e.g. to redraw a frame. */
  onResize?: () => void;
}

/**
 * Keeps a canvas backing store sized to its stage, DPR-aware, via a
 * ResizeObserver, and caches the 2D context in `ctxRef`.
 *
 * The context is acquired on mount and re-acquired after each resize (setting
 * `canvas.width/height` clears the backing store) so callers never have to call
 * `canvas.getContext("2d")` inside a draw/render loop.
 */
export function useCanvasFit(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  stageRef: RefObject<HTMLElement | null>,
  ctxRef: RefObject<CanvasRenderingContext2D | null>,
  { maxDpr, onResize }: UseCanvasFitOptions = {}
): void {
  // Hold the latest onResize in a ref so changing it never re-subscribes the
  // ResizeObserver (which would re-run the sizing effect on every render).
  const onResizeRef = useRef(onResize);
  useEffect(() => {
    onResizeRef.current = onResize;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;

    // Acquire the context once here — never inside the draw render loop —
    // and configure best-quality resampling for cover-fit downscales.
    ctxRef.current = canvas.getContext("2d");
    applyHighQualitySmoothing(ctxRef.current);

    const fit = () => {
      const rect = stage.getBoundingClientRect();
      const cssW = rect.width || stage.clientWidth;
      const cssH = rect.height || stage.clientHeight;
      const cap = maxDpr ?? resolveMaxDpr();
      const dpr = Math.min(window.devicePixelRatio || 1, cap);
      const w = Math.max(1, Math.round(cssW * dpr));
      const h = Math.max(1, Math.round(cssH * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        // Resizing clears the backing store; refresh the cached context and
        // re-apply smoothing (fresh contexts reset to default quality).
        ctxRef.current = canvas.getContext("2d");
        applyHighQualitySmoothing(ctxRef.current);
        onResizeRef.current?.();
      }
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [canvasRef, stageRef, ctxRef, maxDpr]);
}
