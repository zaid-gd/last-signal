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
  background: 'rgba(5, 10, 20, 0.95)',
  border: '2px solid #00e5ff',
  boxShadow: '0 0 30px rgba(0, 229, 255, 0.4)',
  padding: '2rem',
  color: '#00e5ff',
  fontFamily: "'Azeret Mono', monospace",
  backdropFilter: 'blur(10px)',
};

const crtOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  pointerEvents: 'none',
  zIndex: 1000,
  background: `
    linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.1) 50%),
    linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03))
  `,
  backgroundSize: '100% 3px, 3px 100%',
  opacity: 0.8,
  animation: 'crt-flicker 0.15s infinite'
};

const scanlineStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  pointerEvents: 'none',
  zIndex: 1001,
  background: 'linear-gradient(to bottom, transparent, rgba(0, 229, 255, 0.05) 50%, transparent)',
  backgroundSize: '100% 100px',
  animation: 'scanline 8s linear infinite',
};

function AstronautHUD() {
  const health = useGameStore((s) => s.systemHealth);
  const activeMiniGame = useGameStore((s) => s.activeMiniGame);
  const nearestSystem = useGameStore((s) => s.nearestSystem);
  const evaState = useGameStore((s) => s.evaState);
  const enableRetroFilter = useGameStore((s) => s.enableRetroFilter);

  const getHealthColor = (val: number) => {
    if (val >= 60) return '#00ff66';
    if (val >= 30) return '#ffaa00';
    return '#ff0033';
  };

  return (
    <div style={{ 
      position: 'fixed', 
      inset: 0, 
      pointerEvents: 'none', 
      zIndex: 50, 
      color: '#00e5ff', 
      fontFamily: "'Azeret Mono', monospace", 
      padding: '30px', 
      boxSizing: 'border-box',
      textShadow: '0 0 5px rgba(0, 229, 255, 0.5)'
    }}>
      {/* Top Left: O2 Status */}
      <div style={{ position: 'absolute', top: '30px', left: '30px', borderLeft: '3px solid #00e5ff', paddingLeft: '15px' }}>
        <div style={{ fontSize: '0.7rem', opacity: 0.7, marginBottom: '2px' }}>LIFE_SUPPORT_SYSTEM</div>
        <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
          O2 CONC: {Math.floor(health.lifeSupport)}%
        </div>
        <div style={{ width: '220px', height: '6px', background: 'rgba(0, 229, 255, 0.15)', marginTop: '8px', position: 'relative' }}>
          <div style={{ 
            width: `${health.lifeSupport}%`, 
            height: '100%', 
            background: getHealthColor(health.lifeSupport), 
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: `0 0 10px ${getHealthColor(health.lifeSupport)}`
          }} />
        </div>
      </div>

      {/* Top Right: System Alerts */}
      <div style={{ position: 'absolute', top: '30px', right: '30px', textAlign: 'right' }}>
        {(Object.entries(health) as [keyof SystemHealth, number][]).map(([sys, val]) => (
          val < 50 && (
            <div key={sys} style={{ 
              color: getHealthColor(val), 
              animation: 'hud-alert 0.5s infinite alternate',
              marginBottom: '5px',
              fontSize: '0.9rem',
              fontWeight: 'bold'
            }}>
              ⚠ {sys.toUpperCase()} FAILURE IMMINENT: {Math.floor(val)}%
            </div>
          )
        ))}
      </div>

      {/* Bottom Center: Interaction Prompts */}
      <div style={{ position: 'absolute', bottom: '120px', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
        {nearestSystem && !activeMiniGame && (
          <div style={{ 
            fontSize: '1.1rem', 
            background: 'rgba(0, 229, 255, 0.1)', 
            padding: '10px 20px', 
            border: '1px solid rgba(0, 229, 255, 0.3)',
            animation: 'hud-flicker 2s infinite',
            marginBottom: '15px'
          }}>
            {nearestSystem === 'comms' && evaState === 'interior' ? (
              <><span style={{ opacity: 0.7 }}>PRESS</span> [E] <span style={{ opacity: 0.7 }}>TO INITIATE</span> EVA SEQUENCE</>
            ) : nearestSystem === 'comms' && evaState === 'exterior' ? (
              <><span style={{ opacity: 0.7 }}>PRESS</span> [E] <span style={{ opacity: 0.7 }}>TO REPAIR</span> ANTENNA ARRAY</>
            ) : (
              <><span style={{ opacity: 0.7 }}>PRESS</span> [E] <span style={{ opacity: 0.7 }}>TO REPAIR</span> {nearestSystem.toUpperCase()}</>
            )}
          </div>
        )}
        {!activeMiniGame && (
          <>
            <div style={{ fontSize: '0.75rem', opacity: 0.4, letterSpacing: '0.1em' }}>
              LOCAL_COMMS_ACTIVE // PRESS ENTER
            </div>
            <div style={{ fontSize: '0.75rem', opacity: 0.4, letterSpacing: '0.1em', marginTop: '4px' }}>
              OPTICAL_FILTER_SYS // PRESS [F] // {enableRetroFilter ? 'ON' : 'OFF'}
            </div>
          </>
        )}
      </div>

      {/* Helmet Frame / Vignette look */}
      <div style={{
        position: 'absolute',
        inset: 0,
        boxShadow: 'inset 0 0 150px rgba(0, 0, 0, 0.6)',
        border: '40px solid transparent',
        borderImage: 'radial-gradient(circle, transparent 70%, rgba(0, 0, 0, 0.4) 100%) 1',
        pointerEvents: 'none'
      }} />

      <style>{`
        @keyframes hud-alert { 
          0% { opacity: 1; transform: scale(1); } 
          100% { opacity: 0.5; transform: scale(1.02); } 
        }
        @keyframes hud-flicker {
          0% { opacity: 1; }
          1% { opacity: 0.8; }
          2% { opacity: 1; }
          40% { opacity: 1; }
          41% { opacity: 0.9; }
          42% { opacity: 1; }
          100% { opacity: 1; }
        }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        @keyframes crt-flicker {
          0% { opacity: 0.97; }
          5% { opacity: 0.95; }
          10% { opacity: 0.97; }
          15% { opacity: 0.96; }
          20% { opacity: 0.98; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default function AstronautScreen() {
  const [chatTyping, setChatTyping] = useState(false);
  const activeMiniGame = useGameStore((state) => state.activeMiniGame);
  const setActiveMiniGame = useGameStore((state) => state.setActiveMiniGame);
  const evaState = useGameStore((state) => state.evaState);
  const setEvaState = useGameStore((state) => state.setEvaState);
  const toggleRetroFilter = useGameStore((state) => state.toggleRetroFilter);

  // Transition state machine
  useEffect(() => {
    if (evaState === 'transitioning_out') {
      const timer = setTimeout(() => setEvaState('exterior'), 1500);
      return () => clearTimeout(timer);
    }
    if (evaState === 'transitioning_in') {
      const timer = setTimeout(() => setEvaState('interior'), 1500);
      return () => clearTimeout(timer);
    }
  }, [evaState, setEvaState]);

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
      if (e.key.toLowerCase() === 'f' && !chatTyping && !activeMiniGame) {
        toggleRetroFilter();
      }
      if (e.key === 'Escape' && activeMiniGame) {
        handleCloseMiniGame();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeMiniGame, handleCloseMiniGame, chatTyping, toggleRetroFilter]);

  const handleSuccess = useCallback(() => {
    setTimeout(() => {
      handleCloseMiniGame();
      if (evaState === 'exterior') {
        setEvaState('transitioning_in');
      }
    }, 2000);
  }, [handleCloseMiniGame, evaState, setEvaState]);

  return (
    <div style={{ 
      position: 'relative', 
      width: '100vw', 
      height: '100vh', 
      overflow: 'hidden', 
      background: '#000',
    }}>
      <ShipCanvas
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        lookEnabled={!chatTyping && !activeMiniGame}
      />

      <div style={crtOverlayStyle} />
      <div style={scanlineStyle} />

      {!activeMiniGame && <AstronautHUD />}

      {activeMiniGame && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            zIndex: 90,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
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

      {/* EVA Blackout Transition Overlay */}
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          background: '#000',
          zIndex: 80, // Below minigame but above everything else
          pointerEvents: 'none',
          opacity: (evaState === 'transitioning_out' || evaState === 'transitioning_in') ? 1 : 0,
          transition: 'opacity 1.5s ease-in-out',
        }} 
      />
    </div>
  );
}

