import { useCallback, useEffect, useMemo, useState } from 'react';
import { CrisisEngine } from '../../game/CrisisEngine';
import { SystemsManager } from '../../game/SystemsManager';
import { useGameStore } from '../../stores/useGameStore';
import { useRafCountdown } from './useRafCountdown';
import styles from './AntennaWheel.module.css';

const DURATION_MS = 50_000;
const STEP = 3;
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

  useEffect(() => {
    setCommsDelaySeconds(20);
  }, [setCommsDelaySeconds]);

  const handleExpire = useCallback(() => {
    /* Spec: try again on wrong; no explicit expire penalty */
  }, []);

  const remainingMs = useRafCountdown(DURATION_MS, handleExpire);

  const diff = angularDiff(angle, target);
  const strength = Math.max(0, 1 - Math.min(1, diff / 90));

  const nudge = (delta: number) => {
    if (done) return;
    setMsg('');
    setAngle((a) => ((a + delta) % 360 + 360) % 360);
  };

  const tryAlign = () => {
    if (done) return;
    if (diff <= HALF_WIN) {
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

        <div className={styles.controls}>
          <button type="button" className={styles.arrow} disabled={done} onClick={() => nudge(-STEP)} aria-label="Rotate left">
            ◀
          </button>
          <div className={styles.readout}>{angle}°</div>
          <button type="button" className={styles.arrow} disabled={done} onClick={() => nudge(STEP)} aria-label="Rotate right">
            ▶
          </button>
        </div>

        <button type="button" className={styles.alignBtn} disabled={done} onClick={tryAlign}>
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
