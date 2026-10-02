"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * MUSIC PLAYER — floating background-music toggle.
 *
 * Sources /wedding-song.mp3 (looped). Autoplay stays blocked until the
 * visitor's first successful gesture. pointerdown / touchstart / keydown /
 * click listeners remain armed after rejection, then detach on success.
 * A manual tap takes over
 * ownership immediately so the unlock can never fight the toggle.
 * A missing file fails closed: the toggle hides itself, nothing throws.
 */
export default function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const unlockArmedRef = useRef(true);
  const mountedRef = useRef(false);
  const pendingRef = useRef(false);
  const attemptRef = useRef(0);
  const detachUnlockRef = useRef<() => void>(() => {});
  const [playing, setPlaying] = useState(false);
  const [available, setAvailable] = useState(true);

  const invalidatePlayback = useCallback(() => {
    attemptRef.current++;
    pendingRef.current = false;
  }, []);

  const startPlayback = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || pendingRef.current || !mountedRef.current) return;
    const attempt = ++attemptRef.current;
    pendingRef.current = true;
    try {
      audio.volume = 0.7;
      await audio.play();
      if (!mountedRef.current || attempt !== attemptRef.current) return;
      unlockArmedRef.current = false;
      detachUnlockRef.current();
      setPlaying(true);
    } catch {
      if (mountedRef.current && attempt === attemptRef.current) setPlaying(false);
    } finally {
      if (attempt === attemptRef.current) pendingRef.current = false;
    }
  }, []);

  const unlockOnFirstGesture = useCallback((event: Event) => {
    if (!unlockArmedRef.current) return;
    // Let the toggle own its gesture; bubbling must not immediately undo it.
    if (event.target instanceof Node && buttonRef.current?.contains(event.target)) return;
    void startPlayback();
  }, [startPlayback]);

  const togglePlayback = useCallback(async () => {
    unlockArmedRef.current = false;
    detachUnlockRef.current();
    const audio = audioRef.current;
    if (!audio || !available) return;
    if (!audio.paused || pendingRef.current) {
      invalidatePlayback();
      audio.pause();
      setPlaying(false);
    } else {
      await startPlayback();
    }
  }, [available, invalidatePlayback, startPlayback]);

  const handleAudioError = useCallback(() => {
    unlockArmedRef.current = false;
    detachUnlockRef.current();
    invalidatePlayback();
    setAvailable(false);
    setPlaying(false);
  }, [invalidatePlayback]);

  useEffect(() => {
    mountedRef.current = true;
    unlockArmedRef.current = true;
    const audio = audioRef.current;
    const gestures = ["pointerdown", "touchstart", "keydown", "click"] as const;
    const detach = () => {
      gestures.forEach((event) => window.removeEventListener(event, unlockOnFirstGesture));
    };
    detachUnlockRef.current = detach;
    gestures.forEach((event) => {
      window.addEventListener(event, unlockOnFirstGesture, { passive: true });
    });
    return () => {
      mountedRef.current = false;
      unlockArmedRef.current = false;
      invalidatePlayback();
      detach();
      detachUnlockRef.current = () => {};
      audio?.pause();
    };
  }, [invalidatePlayback, unlockOnFirstGesture]);

  if (!available) return null;

  return (
    <>
      <audio
        ref={audioRef}
        src="/wedding-song.mp3"
        loop
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={handleAudioError}
      />
      <button
        ref={buttonRef}
        type="button"
        onClick={() => void togglePlayback()}
        aria-label={playing ? "Pause background music" : "Play background music"}
        aria-pressed={playing}
        className="fixed top-5 right-5 z-50 flex items-center justify-center w-10 h-10 rounded-full bg-[#2b0609]/90 border border-[#d4af37]/40 text-[#d4af37] shadow-lg hover:scale-105 transition-transform"
      >
        <span aria-hidden className={playing ? "text-lg motion-safe:animate-spin" : "text-lg"}>
          {playing ? "💿" : "🔇"}
        </span>
      </button>
    </>
  );
}
