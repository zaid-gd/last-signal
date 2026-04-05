import { useEffect, useRef, useState } from 'react';

interface EventLogEntry {
  timestamp: string;
  type: 'warn' | 'info' | 'error' | 'success';
  text: string;
}

export default function EventLog() {
  const [logs, setLogs] = useState<EventLogEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // This would ideally listen to a global event or store
    // For now, let's mock initial connection
    setLogs([{
      timestamp: '00:00',
      type: 'info',
      text: 'SYSTEM BOOT SUCCESSFUL. STAND BY FOR TELEMETRY.'
    }]);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const typeStyles = {
    warn: 'text-amber-500',
    info: 'text-[#00ff41]/60',
    error: 'text-red-500',
    success: 'text-[#00ff41]'
  };

  const typeIcons = {
    warn: '⚠',
    info: 'ℹ',
    error: '✗',
    success: '●'
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden border border-[#00ff41]/25 rounded bg-[rgba(0,0,0,0.4)] backdrop-blur-sm">
      <div className="border-b border-[#00ff41]/25 bg-[#00ff41]/5 px-3 py-1.5 text-[10px] tracking-[0.2em] font-bold">
        RELAY LOG :: DEEP SPACE SATELLITE NETWORK
      </div>
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-1.5 text-[12px] font-mono scrollbar-thin scrollbar-thumb-[#00ff41]/20"
      >
        {logs.map((log, i) => (
          <div key={i} className="flex space-x-2 leading-relaxed">
            <span className="opacity-40 tabular-nums">[{log.timestamp}]</span>
            <span className={typeStyles[log.type]}>{typeIcons[log.type]}</span>
            <span className="opacity-80 uppercase">{log.text}</span>
          </div>
        ))}
        {logs.length === 0 && (
          <div className="animate-pulse text-[#00ff41]/20">WAITING FOR INCOMING DATA...</div>
        )}
      </div>
    </div>
  );
}
