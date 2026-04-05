import { useState } from 'react';
import TerminalShell from '../missioncontrol/terminal/TerminalShell';
import SystemReadouts from '../missioncontrol/terminal/SystemReadouts';
import EventLog from '../missioncontrol/terminal/EventLog';
import AlertPanel from '../missioncontrol/terminal/AlertPanel';
import GameChatOverlay from './GameChatOverlay';
import { useGameStore } from '../stores/useGameStore';

export default function MissionControlScreen() {
  const [chatTyping, setChatTyping] = useState(false);
  const gameTime = useGameStore((s) => s.gameTime);
  const commsDelay = useGameStore((s) => s.commsDelaySeconds);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <TerminalShell chatTyping={chatTyping}>
      {/* Header bar */}
      <div className="mb-6 flex items-center justify-between border-b border-[#00ff41]/40 pb-4 backdrop-blur-md">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold tracking-[0.4em] text-[#00ff41] drop-shadow-[0_0_8px_rgba(0,255,65,0.6)]">
            MISSION CONTROL HUB
          </h1>
          <span className="text-[10px] text-[#00ff41]/50 uppercase tracking-widest mt-1">
            SATELLITE DOWNLINK STATE: CONNECTED
          </span>
        </div>
        <div className="flex space-x-8 text-[11px] font-mono tracking-widest uppercase">
          <div className="flex flex-col items-end">
            <span className="text-[#00ff41]/40">Signal Delay</span>
            <span className="text-[#00ff41]">{commsDelay.toFixed(1)}s</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[#00ff41]/40">Mission Time</span>
            <span className="text-[#00ff41]">{formatTime(gameTime)}</span>
          </div>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 md:grid-cols-12 gap-6 overflow-hidden">
        {/* Left Side: Telemetry and Alerts */}
        <div className="md:col-span-4 flex flex-col space-y-6">
          <SystemReadouts />
          <AlertPanel />
        </div>

        {/* Right Side: Log feed */}
        <div className="md:col-span-8 flex flex-col overflow-hidden">
          <EventLog />
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
        onTypingChange={setChatTyping}
      />
    </TerminalShell>
  );
}
