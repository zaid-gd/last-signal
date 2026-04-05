import { useEffect, useState } from 'react';
import { CrisisEngine } from '../../game/CrisisEngine';

export default function AlertPanel() {
  const [hints, setHints] = useState<string[]>([]);
  
  useEffect(() => {
    const interval = setInterval(() => {
      const { hints: engineHints } = CrisisEngine.tick(Date.now());
      setHints(engineHints);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  if (hints.length === 0) return null;

  return (
    <div className="mt-4 animate-pulse space-y-2 border border-amber-600 bg-amber-900/10 p-3 text-amber-500 rounded backdrop-blur-sm">
      <h3 className="text-[11px] font-bold tracking-[0.2em] uppercase text-amber-600">SYSTEM ALERTS (PREDICTED)</h3>
      {hints.map((hint, i) => (
        <div key={i} className="text-xs transition-opacity duration-300">
          ● {hint}
        </div>
      ))}
    </div>
  );
}
