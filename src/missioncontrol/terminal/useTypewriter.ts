import { useEffect, useRef, useState } from 'react';

interface TypewriterOptions {
  /** Characters per second. Default: 40 */
  speed?: number;
  /** Milliseconds to wait before starting. Default: 0 */
  delay?: number;
  /** Called when the animation finishes */
  onDone?: () => void;
}

/**
 * Animates `text` one character at a time.
 * Returns the currently-visible slice and a boolean `done`.
 */
export function useTypewriter(
  text: string,
  { speed = 40, delay = 0, onDone }: TypewriterOptions = {}
) {
  const [displayedLength, setDisplayedLength] = useState(0);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Reset on text change
    setDisplayedLength(0);
    setDone(false);

    const msPerChar = 1000 / speed;

    const start = () => {
      intervalRef.current = setInterval(() => {
        setDisplayedLength((prev) => {
          const next = prev + 1;
          if (next >= text.length) {
            clearInterval(intervalRef.current!);
            setDone(true);
            onDone?.();
          }
          return next;
        });
      }, msPerChar);
    };

    if (delay > 0) {
      timeoutRef.current = setTimeout(start, delay);
    } else {
      start();
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, speed, delay]);

  return { displayed: text.slice(0, displayedLength), done };
}
