import { useEffect, useRef, useState } from 'react';
import { CrisisEngine } from '../../game/CrisisEngine';
import { TypewriterText } from './TypewriterText';

interface EventLogEntry {
  id: string; // unique key for keyed rendering + animation
  timestamp: string;
  type: 'warn' | 'info' | 'error' | 'success';
  text: string;
  /** Error/warn entries get the slower typewriter reveal */
  useTypewriter?: boolean;
}

export default function EventLog() {
  const [logs, setLogs] = useState<EventLogEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const seenEvents = useRef(new Set<string>());

  // ── Seed boot message ──────────────────────────────────────────────────────
  useEffect(() => {
    setLogs([
      {
        id: 'boot',
        timestamp: '00:00',
        type: 'info',
        text: 'SYSTEM BOOT SUCCESSFUL. STAND BY FOR TELEMETRY.',
        useTypewriter: true,
      },
    ]);
  }, []);

  // ── Poll CrisisEngine ──────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const activeEvents = CrisisEngine.getActiveEvents();
      if (activeEvents.length > 0) {
        setLogs((prev) => {
          const updated = [...prev];
          activeEvents.forEach((ev) => {
            if (!seenEvents.current.has(ev.id)) {
              seenEvents.current.add(ev.id);
              const now = new Date();
              const ts = `${now.getMinutes().toString().padStart(2, '0')}:${now
                .getSeconds()
                .toString()
                .padStart(2, '0')}`;

              let actionText = '';
              switch (ev.fixAction) {
                case 'seal':
                  actionText = 'HULL PANEL → SEAL SEQUENCE';
                  break;
                case 'power':
                  actionText = 'LIFE SUPPORT PANEL → REROUTE POWER';
                  break;
                case 'breakers':
                  actionText = 'POWER PANEL → RESET BREAKERS';
                  break;
                case 'navcode':
                  actionText = `NAV PANEL → BURN CODE: ${ev.navigationCode}`;
                  break;
                case 'antenna':
                  actionText = 'COMMS PANEL → REALIGN ANTENNA';
                  break;
              }

              updated.push({
                id: `ev-${ev.id}-${Date.now()}`,
                timestamp: ts,
                type: 'error',
                text: `${ev.system.toUpperCase()} BREACH ACTIVE — Tell astronaut: ${actionText}`,
                useTypewriter: true,
              });
            }
          });
          return updated;
        });
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // ── Auto-scroll to bottom on new entry ────────────────────────────────────
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  // ── Style maps ────────────────────────────────────────────────────────────
  const typeTextClass: Record<EventLogEntry['type'], string> = {
    warn:    'text-amber-400 crt-glow-amber',
    info:    'text-[#00ff41]/60',
    error:   'text-red-400 crt-glow-red',
    success: 'text-[#00ff41] crt-glow',
  };

  const typeIcons: Record<EventLogEntry['type'], string> = {
    warn:    '⚠',
    info:    'ℹ',
    error:   '✗',
    success: '●',
  };

  const iconClass: Record<EventLogEntry['type'], string> = {
    warn:    'text-amber-400 crt-glow-amber',
    info:    'text-[#00ff41]/40',
    error:   'text-red-400 crt-glow-red',
    success: 'text-[#00ff41] crt-glow',
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden border border-[#00ff41]/25 rounded bg-[rgba(0,0,0,0.45)] backdrop-blur-sm">
      {/* Header */}
      <div className="border-b border-[#00ff41]/25 bg-[#00ff41]/[0.04] px-3 py-1.5 text-[10px] tracking-[0.22em] font-bold crt-glow">
        RELAY LOG :: DEEP SPACE SATELLITE NETWORK
      </div>

      {/* Log feed */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-2 text-[12px] font-mono scrollbar-thin scrollbar-thumb-[#00ff41]/20"
        style={{ scrollBehavior: 'smooth' }}
      >
        {logs.map((log, i) => (
          /* Each row gets the slide-fade-in animation.
             Delay is staggered slightly for entries that arrive in a batch,
             but kept minimal so the user sees them appear fast. */
          <div
            key={log.id}
            className="log-entry-in flex space-x-2 leading-relaxed"
            style={{ animationDelay: `${Math.min(i * 20, 120)}ms` }}
          >
            <span className="opacity-40 tabular-nums shrink-0">
              [{log.timestamp}]
            </span>
            <span className={`shrink-0 ${iconClass[log.type]}`}>
              {typeIcons[log.type]}
            </span>
            <span className={`uppercase ${typeTextClass[log.type]}`}>
              {log.useTypewriter ? (
                <TypewriterText
                  text={log.text}
                  /* Error lines reveal faster to preserve urgency */
                  speed={log.type === 'error' ? 55 : 38}
                  /* Small delay after slide-in so motion doesn't stack */
                  delay={80}
                  showCursor={true}
                  className={typeTextClass[log.type]}
                />
              ) : (
                log.text
              )}
            </span>
          </div>
        ))}

        {logs.length === 0 && (
          <div className="animate-pulse text-[#00ff41]/20 tracking-widest">
            WAITING FOR INCOMING DATA...
          </div>
        )}
      </div>
    </div>
  );
}
