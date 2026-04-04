import { useState, useEffect } from 'react';
import { useConnectionStore } from '../stores/useConnectionStore';
import { useGameStore } from '../stores/useGameStore';

export default function MissionControlScreen() {
  const [inputText, setInputText] = useState('');
  const { conn } = useConnectionStore();
  const { messages, addMessage } = useGameStore();

  useEffect(() => {
    if (!conn) return;

    const handleData = (data: any) => {
      try {
        const msg = typeof data === 'string' ? JSON.parse(data) : data;

        if (msg.type === 'chat') {
          const delay = msg.sentAt + 10000 - Date.now();

          if (delay > 0) {
            setTimeout(() => {
              addMessage({ ...msg, from: 'partner' });
            }, delay);
          } else {
            addMessage({ ...msg, from: 'partner' });
          }
        }
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    };

    conn.on('data', handleData);

    return () => {
      conn.off('data', handleData);
    };
  }, [conn, addMessage]);

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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#000000' }}>
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <h1
          className="text-6xl font-bold mb-8"
          style={{ fontFamily: 'monospace', color: '#00ff41' }}
        >
          MISSION CONTROL
        </h1>

        <div className="w-full max-w-2xl bg-gray-900 bg-opacity-50 rounded-lg p-6 mb-8 h-64 overflow-y-auto">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className="mb-2"
              style={{
                fontFamily: 'monospace',
                color: msg.from === 'self' ? '#00ff41' : '#00e5ff'
              }}
            >
              <span className="opacity-60">[{msg.from === 'self' ? 'YOU' : 'ASTRONAUT'}]</span> {msg.text}
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 bg-gray-900 bg-opacity-70">
        <div className="max-w-2xl mx-auto flex space-x-4">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type message..."
            className="flex-1 px-4 py-3 bg-black border-2 rounded"
            style={{
              borderColor: '#00ff41',
              fontFamily: 'monospace',
              color: '#00ff41'
            }}
          />
          <button
            onClick={sendMessage}
            className="px-8 py-3 rounded font-semibold"
            style={{
              backgroundColor: '#00ff41',
              color: '#000000',
              fontFamily: 'monospace'
            }}
          >
            SEND
          </button>
        </div>
      </div>
    </div>
  );
}
