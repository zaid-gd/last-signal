import { useCallback, useEffect, useRef, useState } from 'react';
import { useConnectionStore } from '../stores/useConnectionStore';
import { useGameStore } from '../stores/useGameStore';

export interface GameChatOverlayProps {
  /** Your messages use this color */
  selfColor: string;
  /** Partner messages use this color */
  partnerColor: string;
  selfTag: string;
  partnerTag: string;
  inputBorderColor: string;
  sendBg: string;
  sendText: string;
  /** When the chat input is focused, ship/camera controls should pause */
  onTypingChange?: (typing: boolean) => void;
}

export default function GameChatOverlay({
  selfColor,
  partnerColor,
  selfTag,
  partnerTag,
  inputBorderColor,
  sendBg,
  sendText,
  onTypingChange,
}: GameChatOverlayProps) {
  const [inputText, setInputText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { conn } = useConnectionStore();
  const { messages, addMessage } = useGameStore();

  const notifyTyping = useCallback(
    (typing: boolean) => {
      onTypingChange?.(typing);
    },
    [onTypingChange]
  );

  useEffect(() => {
    if (!conn) return;

    const handleData = (data: unknown) => {
      try {
        const msg = typeof data === 'string' ? JSON.parse(data) : data;
        if (msg && typeof msg === 'object' && 'type' in msg && msg.type === 'chat') {
          addMessage({ ...(msg as { type: string; text: string; sentAt: number; from: string }), from: 'partner' });
        }
      } catch {
        /* ignore */
      }
    };

    conn.on('data', handleData);
    return () => {
      conn.off('data', handleData);
    };
  }, [conn, addMessage]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const sendMessage = () => {
    if (!inputText.trim() || !conn) return;
    const message = {
      type: 'chat',
      text: inputText,
      sentAt: Date.now(),
      from: 'self',
    };
    conn.send(JSON.stringify(message));
    addMessage(message);
    setInputText('');
  };

  return (
    <div className="fixed bottom-4 left-4 z-[200] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-1.5 rounded-md border border-white/10 p-2 shadow-lg pointer-events-auto bg-transparent">
      <p className="text-[10px] uppercase tracking-wider opacity-50" style={{ fontFamily: 'monospace', color: selfColor }}>
        Chat — press T
      </p>
      <div
        className="max-h-28 overflow-y-auto rounded px-1 py-1 text-sm"
        style={{ fontFamily: 'monospace', backgroundColor: 'rgba(0,0,0,0.06)' }}
      >
        {messages.map((msg, idx) => (
          <div key={idx} className="mb-1 break-words" style={{ color: msg.from === 'self' ? selfColor : partnerColor }}>
            <span style={{ opacity: 0.55 }}>[{msg.from === 'self' ? selfTag : partnerTag}]</span> {msg.text}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') sendMessage();
            if (e.key === 'Escape') {
              e.currentTarget.blur();
            }
          }}
          onFocus={() => notifyTyping(true)}
          onBlur={() => notifyTyping(false)}
          placeholder="T to type…"
          className="min-w-0 flex-1 rounded border-2 bg-black/30 px-2 py-1.5 text-sm outline-none backdrop-blur-sm placeholder:opacity-40"
          style={{
            borderColor: inputBorderColor,
            fontFamily: 'monospace',
            color: selfColor,
          }}
        />
        <button
          type="button"
          onClick={sendMessage}
          className="shrink-0 rounded px-3 py-1.5 text-xs font-semibold uppercase"
          style={{
            backgroundColor: sendBg,
            color: sendText,
            fontFamily: 'monospace',
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
