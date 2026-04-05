import { useState } from 'react';
import ShipCanvas from '../astronaut/ShipCanvas';
import GameChatOverlay from './GameChatOverlay';

export default function AstronautScreen() {
  const [chatTyping, setChatTyping] = useState(false);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <ShipCanvas className="absolute inset-0 h-full w-full" lookEnabled={!chatTyping} />
      <GameChatOverlay
        selfColor="#00e5ff"
        partnerColor="#00ff41"
        selfTag="YOU"
        partnerTag="CONTROL"
        inputBorderColor="#00e5ff"
        sendBg="#00e5ff"
        sendText="#0a0e1a"
        onTypingChange={setChatTyping}
      />
    </div>
  );
}
