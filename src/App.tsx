import { useEffect } from 'react';
import { useGameStore } from './stores/useGameStore';
import { useConnectionStore } from './stores/useConnectionStore';
import { SystemsManager } from './game/SystemsManager';
import { GameLoop } from './game/GameLoop';
import LobbyScreen from './components/LobbyScreen';
import AstronautScreen from './components/AstronautScreen';
import MissionControlScreen from './components/MissionControlScreen';

type IncomingGameMessage =
  | { type: 'gameOverImmediate'; payload: { reason: string } }
  | { type: 'gameEvent'; event?: 'fix' | 'penalty'; system?: Parameters<typeof SystemsManager.fixSystem>[0]; amount?: number; payload?: { event?: 'GAME_OVER'; reason?: string } };

function PostGameScreen() {
  const { systemHealth, gameEndReason } = useGameStore();
  const failed = Object.values(systemHealth).some(h => h <= 0) || !!gameEndReason;

  return (
    <div style={{
      height: '100vh',
      background: '#000',
      color: '#00e5ff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'monospace'
    }}>
      <h1 style={{ fontSize: '3rem', color: failed ? '#ff2222' : '#00ff41' }}>
        {failed ? 'MISSION FAILED' : 'MISSION COMPLETE'}
      </h1>
      <p>{failed ? `Critical system failure (${gameEndReason || 'unknown'}). All hands lost.` : 'The signal was restored. Hope remains.'}</p>
      <button
        onClick={() => window.location.reload()}
        style={{
          marginTop: '2rem',
          background: 'none',
          border: '1px solid #00e5ff',
          color: '#00e5ff',
          padding: '1rem 2rem',
          cursor: 'pointer'
        }}
      >
        REINITIALIZE
      </button>
    </div>
  );
}

function App() {
  const { phase } = useGameStore();
  const { role, conn } = useConnectionStore();

  useEffect(() => {
    if (phase === 'playing') {
      GameLoop.start();
    } else {
      GameLoop.stop();
    }
    return () => GameLoop.stop();
  }, [phase]);

  useEffect(() => {
    if (!conn) return;

    const handleData = (data: unknown) => {
      try {
        const msg = (typeof data === 'string' ? JSON.parse(data) : data) as IncomingGameMessage;

        if (msg && msg.type === 'gameOverImmediate') {
          useGameStore.getState().setPhase('postgame');
          useGameStore.getState().setGameEndReason(msg.payload.reason);
          return;
        }

        if (msg && msg.type === 'gameEvent') {
          if (msg.event === 'fix' && msg.system && typeof msg.amount === 'number') {
            SystemsManager.fixSystem(msg.system, msg.amount, true);
          } else if (msg.event === 'penalty' && msg.system && typeof msg.amount === 'number') {
            SystemsManager.applyPenalty(msg.system, msg.amount, true);
          } else if (msg.payload?.event === 'GAME_OVER') {
            useGameStore.getState().setPhase('postgame');
            useGameStore.getState().setGameEndReason(msg.payload.reason ?? 'unknown');
          }
        }
      } catch {
        // Silently fail in production
      }
    };

    conn.on('data', handleData);
    return () => conn.off('data', handleData);
  }, [conn]);

  if (phase === 'lobby') {
    return <LobbyScreen />;
  }

  if (phase === 'postgame') {
    return <PostGameScreen />;
  }

  if (phase === 'playing') {
    if (role === 'astronaut') {
      return <AstronautScreen />;
    }
    if (role === 'missionControl') {
      return <MissionControlScreen />;
    }
  }

  return <LobbyScreen />;
}

export default App;
