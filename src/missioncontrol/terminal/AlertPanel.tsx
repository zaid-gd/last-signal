import { useEffect, useRef, useState } from 'react';
import { CrisisEngine, CrisisEvent } from '../../game/CrisisEngine';
import { useGameStore } from '../../stores/useGameStore';
import { TypewriterText } from './TypewriterText';

export default function AlertPanel() {
  const [upcoming, setUpcoming] = useState<{ event: CrisisEvent; timeToTrigger: number }[]>([]);
  const [active, setActive] = useState<CrisisEvent[]>([]);
  // Track which hint IDs have already been "seen" so the typewriter only plays once per hint
  const seenHints = useRef(new Set<string>());
  const healths = useGameStore((s) => s.systemHealth);

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
      case 'seal':     return 'HULL PANEL → RUN SEAL SEQUENCE';
      case 'power':    return 'LIFE SUPPORT PANEL → REROUTE POWER';
      case 'breakers': {
        const combo = event.breakerCombo?.map((b) => (b ? '[ON]' : '[OFF]')).join(' ') || 'UNKNOWN';
        return `POWER PANEL → RESET BREAKERS: ${combo}`;
      }
      case 'navcode':  return `NAV PANEL → ENTER BURN CODE: ${event.navigationCode}`;
      case 'antenna':  return 'COMMS PANEL → REALIGN ANTENNA';
      default:         return 'UNKNOWN ACTION';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <div className="mt-4 border border-amber-600/60 bg-amber-900/10 p-3 text-amber-500 rounded backdrop-blur-sm font-mono flex flex-col gap-2">

      {/* ── Active crises ─────────────────────────────────────────────────── */}
      {active.map((ev) => {
        const isNew = !seenHints.current.has(`act-${ev.id}`);
        if (isNew) seenHints.current.add(`act-${ev.id}`);

        return (
          <div
            key={`act-${ev.id}`}
            /* log-entry-in for the container slide, crt-alert-active for the red pulse glow */
            className="log-entry-in crt-alert-active border border-red-500/60 bg-red-900/20 p-2 text-red-400 rounded"
          >
            <div className="font-bold tracking-widest text-[11px] mb-1 crt-glow-red uppercase">
              [ACTIVE NOW] {ev.system}
            </div>
            <div className="text-xs mb-1 opacity-70">
              {ev.system.toUpperCase()} AT {Math.floor(healths[ev.system])}% — DECAYING {ev.decayRate}%/s
            </div>
            <div className="text-xs flex items-center gap-2 text-red-300">
              →&nbsp;
              {isNew ? (
                <TypewriterText
                  text={`Tell Astronaut: ${getActionText(ev.fixAction, ev)}`}
                  speed={60}
                  delay={120}
                  showCursor={true}
                  className="text-red-300 crt-glow-red"
                />
              ) : (
                <span className="text-red-300">
                  Tell Astronaut: {getActionText(ev.fixAction, ev)}
                </span>
              )}
              {(ev.fixAction === 'navcode' || ev.fixAction === 'breakers') && (
                <button
                  onClick={() => {
                    const text =
                      ev.fixAction === 'navcode'
                        ? `Nav code: ${ev.navigationCode} - go to NAV PANEL`
                        : `Breakers: ${ev.breakerCombo?.map((b) => (b ? '[ON]' : '[OFF]')).join(' ')} - go to POWER PANEL`;
                    copyToClipboard(text);
                  }}
                  className="ml-2 px-1.5 py-0.5 border border-red-400/60 text-[10px] tracking-widest
                             hover:bg-red-400/20 active:scale-95 transition-all cursor-pointer rounded-sm"
                >
                  COPY
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* ── Upcoming / hint ───────────────────────────────────────────────── */}
      {upcoming.map((u) => {
        const isNew = !seenHints.current.has(`upc-${u.event.id}`);
        if (isNew) seenHints.current.add(`upc-${u.event.id}`);

        return (
          <div
            key={`upc-${u.event.id}`}
            className="log-entry-in border border-amber-600/50 bg-amber-900/10 p-2 rounded"
          >
            <div className="font-bold tracking-widest text-[11px] mb-1 crt-glow-amber">
              [IN {u.timeToTrigger}s] {u.event.system.toUpperCase()}
            </div>

            {/* mcHintText gets the typewriter reveal — this is the "incoming crisis hint" */}
            <div className="text-xs mb-1 text-amber-400/80">
              {isNew ? (
                <TypewriterText
                  text={u.event.mcHintText}
                  speed={42}
                  delay={60}
                  showCursor={true}
                  className="text-amber-400/80"
                />
              ) : (
                <span>{u.event.mcHintText}</span>
              )}
            </div>

            <div className="text-xs text-amber-300/70">
              → Tell Astronaut: {getActionText(u.event.fixAction, u.event)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
