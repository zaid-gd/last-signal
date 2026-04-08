import { useEffect, useRef, useState } from 'react';
import { useGameStore, type SystemHealth } from '../stores/useGameStore';

/**
 * useDelayedHealth
 *
 * Returns a version of `systemHealth` that is delayed by `commsDelaySeconds`
 * sourced from the game store.
 *
 * This keeps the astronaut's diegetic 3D environment (lights, smoke) in sync
 * with when Mission Control *actually sent* the crisis alert — honouring the
 * communication lag mechanic without adding any new store fields.
 *
 * Implementation:
 *  - Snapshots systemHealth every 250 ms into a ring buffer.
 *  - Returns the snapshot closest to (now - delayMs).
 *  - Buffer size is capped at 120 entries (~30 s at 250 ms cadence), covering
 *    the full possible commsDelay range.
 */

const SAMPLE_INTERVAL_MS = 250;
const MAX_BUFFER         = 120;   // 30 s of history

interface Snapshot {
  ts: number;
  health: SystemHealth;
}

export function useDelayedHealth(): SystemHealth {
  const buffer = useRef<Snapshot[]>([]);
  const [delayed, setDelayed] = useState<SystemHealth>(() =>
    useGameStore.getState().systemHealth
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const state = useGameStore.getState();
      const now   = Date.now();
      const delayMs = state.commsDelaySeconds * 1000;

      // Add current snapshot
      buffer.current.push({ ts: now, health: { ...state.systemHealth } });

      // Trim old entries beyond max buffer
      if (buffer.current.length > MAX_BUFFER) {
        buffer.current.shift();
      }

      // Find the snapshot closest to (now - delay)
      const targetTs = now - delayMs;
      let best: Snapshot | null = null;
      let bestDiff = Infinity;

      for (const snap of buffer.current) {
        const diff = Math.abs(snap.ts - targetTs);
        if (diff < bestDiff) {
          bestDiff = diff;
          best = snap;
        }
      }

      if (best) {
        setDelayed(best.health);
      }
    }, SAMPLE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  return delayed;
}
