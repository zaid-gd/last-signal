import { useCallback, useRef, useState } from 'react';
import { SystemsManager } from '../../game/SystemsManager';
import { useRafCountdown } from './useRafCountdown';
import styles from './SealSequence.module.css';

const ORDER = [1, 2, 3, 4] as const;
const DURATION_MS = 30_000;

export interface SealSequenceProps {
  onClose?: () => void;
  onSuccess?: () => void;
}

export default function SealSequence({ onClose, onSuccess }: SealSequenceProps) {
  const [sequence, setSequence] = useState<number[]>([]);
  const [status, setStatus] = useState<'idle' | 'wrong' | 'done'>('idle');
  const solvedRef = useRef(false);

  const handleExpire = useCallback(() => {
    if (solvedRef.current) return;
    SystemsManager.applyPenalty('hull', 10);
    setStatus('wrong');
    setTimeout(() => {
      onClose?.();
    }, 2000);
  }, [onClose]);

  const remainingMs = useRafCountdown(DURATION_MS, handleExpire);

  const push = (n: number) => {
    if (solvedRef.current) return;
    const next = [...sequence, n];
    const expected = ORDER.slice(0, next.length);
    const match = next.every((v, i) => v === expected[i]);
    if (!match) {
      SystemsManager.applyPenalty('hull', 5);
      setSequence([]);
      setStatus('wrong');
      return;
    }
    if (next.length === ORDER.length) {
      solvedRef.current = true;
      SystemsManager.fixSystem('hull', 20);
      setStatus('done');
      onSuccess?.();
      return;
    }
    setSequence(next);
    setStatus('idle');
  };

  const sec = Math.ceil(remainingMs / 1000);
  const timerClass =
    sec <= 10 ? styles.danger : sec <= 20 ? styles.warn : '';

  return (
    <div className={styles.root}>
      {onClose && (
        <button type="button" className={styles.exitBtn} onClick={onClose}>
          X
        </button>
      )}
      <h2 className={styles.title}>Hull breach — seal sequence</h2>
      <div className={`${styles.timer} ${timerClass}`}>{sec}s</div>
      <p className={styles.hint}>Activate seals in order 1 → 2 → 3 → 4</p>
      <div className={styles.buttons}>
        {ORDER.map((n) => (
          <button
            key={n}
            type="button"
            className={styles.btn}
            disabled={status === 'done'}
            onClick={() => push(n)}
          >
            {n}
          </button>
        ))}
      </div>
      <div
        className={`${styles.status} ${
          status === 'done' ? styles.ok : status === 'wrong' ? styles.bad : ''
        }`}
      >
        {status === 'done' && 'SEAL CONFIRMED — HULL STABILIZED'}
        {status === 'wrong' && sequence.length === 0 && 'SEQUENCE RESET — HULL STRESS'}
        {status === 'idle' && sequence.length > 0 && `Progress: ${sequence.join(' → ')}`}
      </div>
      {status === 'done' && (
        <button type="button" className={styles.btn} style={{ marginTop: '0.75rem', width: '100%' }} onClick={onClose}>
          Close
        </button>
      )}
    </div>
  );
}
