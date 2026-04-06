import { useCallback, useEffect, useMemo, useState } from 'react';
import { CrisisEngine } from '../../game/CrisisEngine';
import { SystemsManager } from '../../game/SystemsManager';
import { useGameStore } from '../../stores/useGameStore';
import { useRafCountdown } from './useRafCountdown';
import styles from './AntennaWheel.module.css';

const DURATION_MS = 50_000;
const STEP_DEGREES = 0.5;
const WINDOW_DEG = 15;
const HALF_WIN = WINDOW_DEG / 2;

function angularDiff(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
}

export interface AntennaWheelProps {
  onClose?: () => void;
  onSuccess?: () => void;
}

export default function AntennaWheel({ onClose, onSuccess }: AntennaWheelProps) {
  const target = useMemo(() => CrisisEngine.getAntennaTargetDegrees(), []);
  const [angle, setAngle] = useState(0);
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState('');
  const setCommsDelaySeconds = useGameStore((s) => s.setCommsDelaySeconds);

  const handleExpire = useCallback(() => {
    setTimeout(() => {
      onClose?.();
    }, 2000);
  }, [onClose]);

  const remainingMs = useRafCountdown(DURATION_MS, handleExpire);

  useEffect(() => {
    if (done) return;
    const held = { left: false, right: false };
    let raf: number;

    const tick = () => {
      if (held.left)  setAngle(prev => (prev - STEP_DEGREES + 360) % 360);
      if (held.right) setAngle(prev => (prev + STEP_DEGREES) % 360);
      raf = requestAnimationFrame(tick);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  { held.left  = true; e.preventDefault(); }
      if (e.key === 'ArrowRight') { held.right = true; e.preventDefault(); }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  held.left  = false;
      if (e.key === 'ArrowRight') held.right = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup',   onKeyUp);
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup',   onKeyUp);
      cancelAnimationFrame(raf);
    };
  }, [done]);

  const diff = angularDiff(angle, target);
  const strength = Math.max(0, 1 - Math.min(1, diff / 90));
  const isLocked = strength > 0.916; // 1 - 7.5/90 = 0.9166... meaning diff < 7.5 deg

  const nudge = (delta: number) => {
    if (done) return;
    setMsg('');
    setAngle((a) => ((a + delta) % 360 + 360) % 360);
  };

  const tryAlign = () => {
    if (done) return;
    if (isLocked) {
      setDone(true);
      setCommsDelaySeconds(10);
      SystemsManager.fixSystem('comms', 25);
      onSuccess?.();
      return;
    }
    setMsg('Signal not locked — adjust bearing');
  };

  const sec = Math.ceil(remainingMs / 1000);

  const r = 80;
  const cx = 100;
  const cy = 100;
  const rad = ((angle - 90) * Math.PI) / 180;
  const px = cx + r * Math.cos(rad);
  const py = cy + r * Math.sin(rad);

  return (
    <div className={styles.root}>
      {onClose && (
        <button type="button" className={styles.exitBtn} onClick={onClose}>
          X
        </button>
      )}
      <h2 className={styles.title}>Comms — antenna bearing</h2>
      <div className={styles.timer}>{sec}s</div>
      <p className={styles.hint}>Rotate into the lock window (±{HALF_WIN}°). Signal rises as you approach the solution.</p>

      <div className={styles.dialWrap}>
        <svg className={styles.dialSvg} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <circle cx={cx} cy={cy} r={r + 8} fill="none" stroke="rgba(0,229,255,0.15)" strokeWidth={4} />
          <circle cx={cx} cy={cy} r={r} fill="rgba(0,229,255,0.04)" stroke="#00e5ff" strokeWidth={2} />
          <line x1={cx} y1={cy} x2={px} y2={py} stroke="#00e5ff" strokeWidth={3} strokeLinecap="round" />
          <circle cx={cx} cy={cy} r={6} fill="#0a1628" stroke="#00e5ff" strokeWidth={2} />
        </svg>

        <div className={styles.meterLabel}>SIGNAL STRENGTH</div>
        <div className={styles.meterTrack}>
          <div className={styles.meterFill} style={{ width: `${strength * 100}%` }} />
        </div>
        {isLocked && !done && (
          <div style={{ color: '#00ff41', fontWeight: 'bold', fontSize: '0.8rem', marginTop: '4px' }}>SIGNAL LOCKED</div>
        )}

        <div className={styles.controls}>
          <button type="button" className={styles.arrow} disabled={done} onPointerDown={() => nudge(-STEP_DEGREES)} aria-label="Rotate left">
            ◀
          </button>
          <div className={styles.readout}>{Math.floor(angle)}°</div>
          <button type="button" className={styles.arrow} disabled={done} onPointerDown={() => nudge(STEP_DEGREES)} aria-label="Rotate right">
            ▶
          </button>
        </div>

        <button type="button" className={styles.alignBtn} disabled={done || !isLocked} onClick={tryAlign}>
          Lock bearing
        </button>
      </div>

      {msg && <div className={styles.msg}>{msg}</div>}

      {done && (
        <div className={styles.ok}>
          UPLINK STABLE — DELAY 10s
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
