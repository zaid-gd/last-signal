import { useCallback, useRef, useState } from 'react';
import { SystemsManager } from '../../game/SystemsManager';
import { useRafCountdown } from './useRafCountdown';
import styles from './PowerRouter.module.css';

const DURATION_MS = 45_000;

/** Node centers in SVG space */
const NODES = [
  { id: 0, x: 64, y: 72, label: 'A' },
  { id: 1, x: 200, y: 72, label: 'B' },
  { id: 2, x: 336, y: 72, label: 'C' },
] as const;

const R = 28;

export interface PowerRouterProps {
  onClose?: () => void;
  onSuccess?: () => void;
}

export default function PowerRouter({ onClose, onSuccess }: PowerRouterProps) {
  const [tokenAt, setTokenAt] = useState(0);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [done, setDone] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const handleExpire = useCallback(() => {
    /* Spec: no penalty on expire for life support router */
  }, []);

  const remainingMs = useRafCountdown(DURATION_MS, handleExpire);

  const toSvgCoords = (clientX: number, clientY: number) => {
    const el = svgRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    const vb = el.viewBox.baseVal;
    return {
      x: ((clientX - rect.left) / rect.width) * vb.width,
      y: ((clientY - rect.top) / rect.height) * vb.height,
    };
  };

  const onTokenDown = (e: React.PointerEvent) => {
    if (done) return;
    e.preventDefault();
    const p = toSvgCoords(e.clientX, e.clientY);
    setDrag(p);
    svgRef.current?.setPointerCapture(e.pointerId);
  };

  const onSvgPointerMove = (e: React.PointerEvent) => {
    if (drag === null || done) return;
    setDrag(toSvgCoords(e.clientX, e.clientY));
  };

  const snapToNode = (x: number, y: number): number | null => {
    for (const n of NODES) {
      const d = Math.hypot(x - n.x, y - n.y);
      if (d < R + 12) return n.id;
    }
    return null;
  };

  const onSvgPointerUp = (e: React.PointerEvent) => {
    if (drag === null || done) return;
    try {
      svgRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    const p = toSvgCoords(e.clientX, e.clientY);
    const hit = snapToNode(p.x, p.y);
    setDrag(null);

    if (hit === null) return;

    if (tokenAt === 0 && hit === 1) {
      setTokenAt(1);
      return;
    }
    if (tokenAt === 1 && hit === 2) {
      setDone(true);
      SystemsManager.fixSystem('lifeSupport', 25);
      onSuccess?.();
      return;
    }
    /* Wrong drop: no state change (forgiving) */
  };

  const tx = drag ? drag.x : NODES[tokenAt].x;
  const ty = drag ? drag.y : NODES[tokenAt].y;

  const sec = Math.ceil(remainingMs / 1000);

  return (
    <div className={styles.root}>
      {onClose && (
        <button type="button" className={styles.exitBtn} onClick={onClose}>
          X
        </button>
      )}
      <h2 className={styles.title}>Life support — route power</h2>
      <div className={styles.timer}>{sec}s</div>
      <p className={styles.hint}>Drag the charge from A → B → C to complete the circuit.</p>

      <svg
        ref={svgRef}
        className={styles.svgWrap}
        viewBox="0 0 400 120"
        xmlns="http://www.w3.org/2000/svg"
        onPointerMove={onSvgPointerMove}
        onPointerUp={onSvgPointerUp}
        onPointerCancel={onSvgPointerUp}
      >
        <line className={styles.edge} x1={NODES[0].x} y1={NODES[0].y} x2={NODES[1].x} y2={NODES[1].y} />
        <line className={styles.edge} x1={NODES[1].x} y1={NODES[1].y} x2={NODES[2].x} y2={NODES[2].y} />

        {NODES.map((n) => (
          <g key={n.id}>
            <circle
              className={`${styles.node} ${tokenAt === n.id && !drag ? styles.active : ''}`}
              cx={n.x}
              cy={n.y}
              r={R}
              fill="rgba(0,229,255,0.06)"
              stroke="#00e5ff"
              strokeWidth={2}
            />
            <text x={n.x} y={n.y + 4} textAnchor="middle" className={styles.label}>
              {n.label}
            </text>
          </g>
        ))}

        <circle
          className={`${styles.token} ${drag ? styles.tokenDragging : ''}`}
          cx={tx}
          cy={ty}
          r={14}
          fill="#00e5ff"
          stroke="#0a1628"
          strokeWidth={2}
          onPointerDown={onTokenDown}
        />
      </svg>

      {done && (
        <div className={styles.status}>
          CIRCUIT COMPLETE — SCRUBBERS ONLINE
          {onClose && (
            <button
              type="button"
              className={styles.title}
              style={{
                display: 'block',
                marginTop: '0.75rem',
                padding: '0.5rem',
                width: '100%',
                border: '2px solid #00e5ff',
                background: 'rgba(0,229,255,0.1)',
                cursor: 'pointer',
                color: '#00e5ff',
              }}
              onClick={onClose}
            >
              Close
            </button>
          )}
        </div>
      )}
    </div>
  );
}
