import { useEffect, useState } from 'react';
import { useGameStore } from '../stores/useGameStore';
import GameChatOverlay from './GameChatOverlay';

const SYSTEM_ROWS = [
  { key: 'hull' as const, label: 'HULL INTEGRITY' },
  { key: 'lifeSupport' as const, label: 'LIFE SUPPORT' },
  { key: 'power' as const, label: 'POWER GRID' },
  { key: 'navigation' as const, label: 'NAVIGATION' },
  { key: 'comms' as const, label: 'COMMS ARRAY' },
];

export default function MissionControlScreen() {
  const [selected, setSelected] = useState(0);
  const systemHealth = useGameStore((s) => s.systemHealth);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return;
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelected((i) => Math.max(0, i - 1));
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelected((i) => Math.min(SYSTEM_ROWS.length - 1, i + 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black text-[#00ff41]">
      <div
        className="absolute inset-0 flex flex-col p-8 pt-10 font-mono"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,255,65,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,65,0.03) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      >
        <h1 className="mb-6 text-center text-xl font-bold tracking-[0.3em] text-[#00ff41] opacity-90 md:text-2xl">
          MISSION CONTROL
        </h1>
        <p className="mb-4 text-center text-[10px] uppercase tracking-widest opacity-50">
          ↑↓ select system — T to chat
        </p>
        <div className="mx-auto w-full max-w-lg flex-1 rounded border border-[#00ff41]/25 bg-transparent px-4 py-3">
          <p className="mb-3 text-[11px] uppercase tracking-wider opacity-60">Ship systems</p>
          <ul className="space-y-1">
            {SYSTEM_ROWS.map((row, idx) => {
              const v = systemHealth[row.key];
              const active = idx === selected;
              return (
                <li
                  key={row.key}
                  className={`flex cursor-default items-center justify-between rounded px-2 py-1.5 text-sm transition-colors ${
                    active ? 'bg-[#00ff41]/10 text-[#00ff41]' : 'text-[#00ff41]/80'
                  }`}
                >
                  <span>{row.label}</span>
                  <span className="tabular-nums">{v}%</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <GameChatOverlay
        selfColor="#00ff41"
        partnerColor="#00e5ff"
        selfTag="YOU"
        partnerTag="ASTRONAUT"
        inputBorderColor="#00ff41"
        sendBg="#00ff41"
        sendText="#000000"
      />
    </div>
  );
}
