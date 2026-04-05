import { useEffect, useRef, useState } from 'react';

/** Countdown using requestAnimationFrame (no setTimeout). */
export function useRafCountdown(durationMs: number, onExpire: () => void) {
  const [remainingMs, setRemainingMs] = useState(durationMs);
  const firedRef = useRef(false);
  const cbRef = useRef(onExpire);
  cbRef.current = onExpire;

  useEffect(() => {
    firedRef.current = false;
    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const rem = Math.max(0, durationMs - elapsed);
      setRemainingMs(rem);
      if (rem <= 0) {
        if (!firedRef.current) {
          firedRef.current = true;
          cbRef.current();
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [durationMs]);

  return remainingMs;
}
