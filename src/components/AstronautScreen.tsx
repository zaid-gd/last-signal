import { useState, useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
import ShipCanvas from '../astronaut/ShipCanvas';
import { requestShipCameraControl } from '../astronaut/shipCameraControl';
import GameChatOverlay from './GameChatOverlay';
import SealSequence from '../astronaut/minigames/SealSequence';
import PowerRouter from '../astronaut/minigames/PowerRouter';
import BreakerPanel from '../astronaut/minigames/BreakerPanel';
import NavKeypad from '../astronaut/minigames/NavKeypad';
import AntennaWheel from '../astronaut/minigames/AntennaWheel';
import { useGameStore, type SystemHealth } from '../stores/useGameStore';

const miniGameOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  zIndex: 100,
  background: 'rgba(5, 10, 20, 0.9)',
  border: '2px solid #00e5ff',
  boxShadow: '0 0 20px rgba(0, 229, 255, 0.3)',
  padding: '2rem',
  color: '#00e5ff',
  fontFamily: 'monospace',
};

const crtOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  pointerEvents: 'none',
  zIndex: 1000,
  background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
  backgroundSize: '100% 4px, 3px 100%',
};

function AstronautHUD() {
  const health = useGameStore((s) => s.systemHealth);
  const activeMiniGame = useGameStore((s) => s.activeMiniGame);
  const nearestSystem = useGameStore((s) => s.nearestSystem);

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 50, color: '#00e5ff', fontFamily: 'monospace', padding: '20px', boxSizing: 'border-box' }}>
      <div style={{ position: 'absolute', top: '20px', left: '20px' }}>
        O2 CONCENTRATION: {Math.floor(health.lifeSupport)}%
        <div style={{ width: '200px', height: '4px', background: 'rgba(0, 229, 255, 0.1)', marginTop: '5px' }}>
          <div style={{ width: `${health.lifeSupport}%`, height: '100%', background: '#00e5ff', transition: 'width 0.3s' }} />
        </div>
      </div>
      <div style={{ position: 'absolute', top: '20px', right: '20px', textAlign: 'right' }}>
        {(Object.entries(health) as [keyof SystemHealth, number][]).map(([sys, val]) => (
          val < 50 && (
            <div key={sys} style={{ color: '#ff2222', animation: 'hud-pulse 1s infinite' }}>
              WARNING: {sys.toUpperCase()} CRITICAL ({Math.floor(val)}%)
            </div>
          )
        ))}
      </div>
      <div style={{ position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
        {nearestSystem && !activeMiniGame && (
          <div style={{ fontSize: '1.2rem', textShadow: '0 0 10px #00e5ff' }}>
            [E] ACCESS {nearestSystem.toUpperCase()} PANEL
          </div>
        )}
        {!activeMiniGame && (
          <div style={{ fontSize: '0.8rem', opacity: 0.5, marginTop: '10px' }}>
            PRESS ENTER TO COMMUNICATE
          </div>
        )}
      </div>
      <style>{`
        @keyframes hud-pulse { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }
      `}</style>
    </div>
  );
}

export default function AstronautScreen() {
  const [chatTyping, setChatTyping] = useState(false);
  const activeMiniGame = useGameStore((state) => state.activeMiniGame);
  const setActiveMiniGame = useGameStore((state) => state.setActiveMiniGame);

  const handleCloseMiniGame = useCallback(() => {
    flushSync(() => {
      setActiveMiniGame(null);
    });
    document.body.style.cursor = 'auto';
    if (!chatTyping) {
      requestShipCameraControl();
    }
  }, [chatTyping, setActiveMiniGame]);

  useEffect(() => {
    if (activeMiniGame) {
      // Ensure cursor is released from 3D view when minigame opens
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
      document.body.style.cursor = 'auto';
    }
  }, [activeMiniGame]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeMiniGame) {
        handleCloseMiniGame();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeMiniGame, handleCloseMiniGame]);

  const handleSuccess = useCallback(() => {
    setTimeout(() => {
      handleCloseMiniGame();
    }, 2000);
  }, [handleCloseMiniGame]);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#000' }}>
      <ShipCanvas
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        lookEnabled={!chatTyping && !activeMiniGame}
      />

      <div style={crtOverlayStyle} />

      {!activeMiniGame && <AstronautHUD />}

      {activeMiniGame && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            zIndex: 90,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            // Explicitly prevent any pointer events from leaking to canvas
            pointerEvents: 'all'
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            handleCloseMiniGame();
          }}
        >
          <div
            style={miniGameOverlayStyle}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {activeMiniGame === 'hull' && <SealSequence onClose={handleCloseMiniGame} onSuccess={handleSuccess} />}
            {activeMiniGame === 'lifeSupport' && <PowerRouter onClose={handleCloseMiniGame} onSuccess={handleSuccess} />}
            {activeMiniGame === 'power' && <BreakerPanel onClose={handleCloseMiniGame} onSuccess={handleSuccess} />}
            {activeMiniGame === 'navigation' && <NavKeypad onClose={handleCloseMiniGame} onSuccess={handleSuccess} />}
            {activeMiniGame === 'comms' && <AntennaWheel onClose={handleCloseMiniGame} onSuccess={handleSuccess} />}
          </div>
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
