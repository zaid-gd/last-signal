import { useEffect, useState } from 'react';
import { CrisisEngine, CrisisEvent } from '../../game/CrisisEngine';
import { useGameStore } from '../../stores/useGameStore';

export default function AlertPanel() {
  const [upcoming, setUpcoming] = useState<{ event: CrisisEvent, timeToTrigger: number }[]>([]);
  const [active, setActive] = useState<CrisisEvent[]>([]);
  const healths = useGameStore(s => s.systemHealth);

  useEffect(() => {
    const interval = setInterval(() => {
      setUpcoming(CrisisEngine.getUpcomingEvents(Date.now()));
      setActive(CrisisEngine.getActiveEvents());
    }, 100);
    return () => clearInterval(interval);
  }, []);

  if (upcoming.length === 0 && active.length === 0) return null;

  const getActionText = (action: string, event: CrisisEvent) => {
    switch (action) {
      case 'seal': return 'HULL PANEL \u2192 RUN SEAL SEQUENCE';
      case 'power': return 'LIFE SUPPORT PANEL \u2192 REROUTE POWER';
      case 'breakers': {
        const combo = event.breakerCombo?.map(b => b ? '[ON]' : '[OFF]').join(' ') || 'UNKNOWN';
        return `POWER PANEL \u2192 RESET BREAKERS: ${combo}`;
      }
      case 'navcode': return `NAV PANEL \u2192 ENTER BURN CODE: ${event.navigationCode}`;
      case 'antenna': return 'COMMS PANEL \u2192 REALIGN ANTENNA';
      default: return 'UNKNOWN ACTION';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <div className="mt-4 border border-amber-600 bg-amber-900/10 p-3 text-amber-500 rounded backdrop-blur-sm font-mono flex flex-col gap-2">
      {active.map((ev, i) => (
        <div key={`act-${i}`} className="border border-red-500/50 bg-red-900/20 p-2 text-red-400">
          <div className="font-bold tracking-widest text-[11px] mb-1">[ACTIVE NOW] {ev.system.toUpperCase()}</div>
          <div className="text-xs mb-1">{ev.system.toUpperCase()} at {Math.floor(healths[ev.system])}% \u2014 decaying {ev.decayRate}%/s</div>
          <div className="text-xs flex items-center gap-2 text-red-300">
            \u2192 Tell Astronaut: {getActionText(ev.fixAction, ev)}
            {(ev.fixAction === 'navcode' || ev.fixAction === 'breakers') && (
              <button
                onClick={() => {
                  const text = ev.fixAction === 'navcode'
                    ? `Nav code: ${ev.navigationCode} - go to NAV PANEL`
                    : `Breakers: ${ev.breakerCombo?.map(b => b ? '[ON]' : '[OFF]').join(' ')} - go to POWER PANEL`;
                  copyToClipboard(text);
                }}
                className="ml-2 px-1 border border-red-400 text-[10px] hover:bg-red-400/20 cursor-pointer"
              >
                COPY
              </button>
            )}
          </div>
        </div>
      ))}

      {upcoming.map((u, i) => (
        <div key={`upc-${i}`} className="border border-amber-600/50 p-2">
          <div className="font-bold tracking-widest text-[11px] mb-1">[IN {u.timeToTrigger}s] {u.event.system.toUpperCase()}</div>
          <div className="text-xs mb-1">{u.event.mcHintText}</div>
          <div className="text-xs flex items-center gap-2 text-amber-300">
            \u2192 Tell Astronaut: {getActionText(u.event.fixAction, u.event)}
          </div>
        </div>
      ))}
    </div>
  );
}
