import { useCallback, useEffect, useMemo, useState } from 'react';
import { CrisisEngine } from '../../game/CrisisEngine';
import { SystemsManager } from '../../game/SystemsManager';
import styles from './BreakerPanel.module.css';

const DURATION_MS = 40_000;

function combosMatch(a: boolean[], b: boolean[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

export interface BreakerPanelProps {
  onClose?: () => void;
  onSuccess?: () => void;
}

export default function BreakerPanel({ onClose, onSuccess }: BreakerPanelProps) {
  const target = useMemo(() => CrisisEngine.getActiveBreakerCombo(), []);
  const [states, setStates] = useState<boolean[]>(() => target.map(() => false));
  const [done, setDone] = useState(false);
  const [remainingMs, setRemainingMs] = useState(DURATION_MS);

  useEffect(() => {
    if (done) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      const rem = Math.max(0, DURATION_MS - elapsed);
      setRemainingMs(rem);
      if (rem > 0) {
        raf = requestAnimationFrame(tick);
      } else {
        setTimeout(() => {
          onClose?.();
        }, 2000);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [done, onClose]);

  const checkWin = useCallback(
    (next: boolean[]) => {
      if (done) return;
      if (combosMatch(next, target)) {
        setDone(true);
        SystemsManager.fixSystem('power', 30);
        onSuccess?.();
      }
    },
    [done, onSuccess, target]
  );

  const toggle = (index: number) => {
    if (done) return;
    setStates((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      checkWin(next);
      return next;
    });
  };

  const sec = Math.ceil(remainingMs / 1000);

  return (
    <div className={styles.root}>
      {onClose && (
        <button type="button" className={styles.exitBtn} onClick={onClose}>
          X
        </button>
      )}
      <h2 className={styles.title}>Power grid — breaker alignment</h2>
      <div className={styles.timer}>{sec}s</div>
      <p className={styles.hint}>Match the pattern for this crisis. Toggle breakers to match the active schematic.</p>

      <div className={styles.grid}>
        {states.map((on, i) => (
          <div key={i} className={styles.switchWrap}>
            <span className={styles.idx}>{`B${i + 1}`}</span>
            <button
              type="button"
              className={styles.track}
              disabled={done}
              onClick={() => toggle(i)}
              aria-pressed={on}
            >
              <span className={`${styles.thumb} ${on ? styles.on : styles.off}`} />
            </button>
            <div className={styles.labelRow}>
              <span>OFF</span>
              <span>ON</span>
            </div>
          </div>
        ))}
      </div>

      {done && (
        <div className={styles.status}>
          GRID STABLE — POWER RESTORED
          {onClose && (
            <button type="button" className={styles.closeBtn} onClick={onClose}>
              Close
            </button>
          )}
        </div>
      )}
    </div>
  );
}
