import { useState } from 'react';
import ShipCanvas from '../astronaut/ShipCanvas';
import GameChatOverlay from './GameChatOverlay';
import SealSequence from '../astronaut/minigames/SealSequence';
import PowerRouter from '../astronaut/minigames/PowerRouter';
import BreakerPanel from '../astronaut/minigames/BreakerPanel';
import NavKeypad from '../astronaut/minigames/NavKeypad';
import AntennaWheel from '../astronaut/minigames/AntennaWheel';
import { useGameStore } from '../stores/useGameStore';

const miniGameOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  zIndex: 100,
  background: 'rgba(10,14,26,0.95)',
  border: '1px solid #00e5ff',
  backdropFilter: 'blur(8px)',
};

export default function AstronautScreen() {
  const [chatTyping, setChatTyping] = useState(false);
  const activeMiniGame = useGameStore((state: any) => state.activeMiniGame);
  const setActiveMiniGame = useGameStore((state: any) => state.setActiveMiniGame);
  const handleCloseMiniGame = () => setActiveMiniGame(null);
  
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#000' }}>
      <ShipCanvas style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} lookEnabled={!chatTyping && !activeMiniGame} />
      
      {activeMiniGame === 'hull' && (
        <div style={miniGameOverlayStyle}>
          <SealSequence onClose={handleCloseMiniGame} />
        </div>
      )}
      {activeMiniGame === 'lifeSupport' && (
        <div style={miniGameOverlayStyle}>
          <PowerRouter onClose={handleCloseMiniGame} />
        </div>
      )}
      {activeMiniGame === 'power' && (
        <div style={miniGameOverlayStyle}>
          <BreakerPanel onClose={handleCloseMiniGame} />
        </div>
      )}
      {activeMiniGame === 'navigation' && (
        <div style={miniGameOverlayStyle}>
          <NavKeypad onClose={handleCloseMiniGame} />
        </div>
      )}
      {activeMiniGame === 'comms' && (
        <div style={miniGameOverlayStyle}>
          <AntennaWheel onClose={handleCloseMiniGame} />
        </div>
      )}
      
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
