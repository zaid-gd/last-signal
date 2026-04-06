import { useEffect, useRef, useState } from 'react';
import { CrisisEngine } from '../../game/CrisisEngine';
import { SystemsManager } from '../../game/SystemsManager';
import styles from './NavKeypad.module.css';

const TOTAL_MS = 60_000;
const PENALTY_MS = 10_000;

export interface NavKeypadProps {
  onClose?: () => void;
  onSuccess?: () => void;
}

export default function NavKeypad({ onClose, onSuccess }: NavKeypadProps) {
  const endRef = useRef(Date.now() + TOTAL_MS);
  const [remainingMs, setRemainingMs] = useState(TOTAL_MS);
  const [entry, setEntry] = useState('');
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (done) return;
    let raf = 0;
    const loop = () => {
      const rem = Math.max(0, endRef.current - Date.now());
      setRemainingMs(rem);
      if (rem > 0) {
        raf = requestAnimationFrame(loop);
      } else {
        setTimeout(() => {
          onClose?.();
        }, 2000);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [done, onClose]);

  const append = (d: string) => {
    if (done) return;
    setEntry((e) => (e.length >= 6 ? e : e + d));
    setMsg('');
  };

  const clear = () => {
    if (done) return;
    setEntry('');
    setMsg('');
  };

  const submit = () => {
    if (done) return;
    if (entry.length !== 6) {
      setMsg('Enter six digits');
      return;
    }
    if (CrisisEngine.validateNavigationCode(entry)) {
      setDone(true);
      SystemsManager.fixSystem('navigation', 35);
      onSuccess?.();
      return;
    }
    endRef.current = Math.max(Date.now(), endRef.current - PENALTY_MS);
    setMsg('Invalid code — timer −10s');
  };

  const sec = Math.ceil(remainingMs / 1000);

  return (
    <div className={styles.root}>
      {onClose && (
        <button type="button" className={styles.exitBtn} onClick={onClose}>
          X
        </button>
      )}
      <h2 className={styles.title}>Navigation — secure channel</h2>
      <div className={`${styles.timer} ${msg.startsWith('Invalid') ? styles.penalty : ''}`}>{sec}s</div>
      <p className={styles.hint}>
        Mission Control must send the 6-digit code over chat. Enter it here and press ENTER.
      </p>
      <div className={styles.display}>{entry.padEnd(6, '·')}</div>
      <div className={styles.pad}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => (
          <button key={k} type="button" className={styles.key} disabled={done} onClick={() => append(k)}>
            {k}
          </button>
        ))}
        <button type="button" className={styles.key} disabled={done} onClick={clear}>
          CLEAR
        </button>
        <button type="button" className={styles.key} disabled={done} onClick={() => append('0')}>
          0
        </button>
        <button type="button" className={styles.key} disabled={done} onClick={submit}>
          ENTER
        </button>
      </div>
      {msg && <div className={styles.msg}>{msg}</div>}
      {done && (
        <div className={`${styles.msg} ${styles.ok}`}>
          NAV LOCK RESTORED
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
