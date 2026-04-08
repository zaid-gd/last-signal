import React from 'react';
import { useTypewriter } from './useTypewriter';

interface TypewriterTextProps {
  /** The full string to animate */
  text: string;
  /** Characters per second (default 38) */
  speed?: number;
  /** Delay (ms) before starting (default 0) */
  delay?: number;
  /** Extra className applied to the wrapping span */
  className?: string;
  /** Show a blinking cursor while typing */
  showCursor?: boolean;
  /** Called when typing completes */
  onDone?: () => void;
}

/**
 * Renders `text` with a typewriter reveal animation.
 * Accepts the same className as a regular span so it can be styled inline.
 */
export function TypewriterText({
  text,
  speed = 38,
  delay = 0,
  className = '',
  showCursor = true,
  onDone,
}: TypewriterTextProps) {
  const { displayed, done } = useTypewriter(text, { speed, delay, onDone });

  return (
    <span className={className}>
      {displayed}
      {showCursor && !done && (
        <span
          aria-hidden="true"
          style={{
            display: 'inline-block',
            width: '0.55em',
            background: 'currentColor',
            marginLeft: '1px',
            verticalAlign: 'text-bottom',
            animation: 'crt-cursor-blink 0.7s steps(1) infinite',
          }}
        />
      )}
    </span>
  );
}
