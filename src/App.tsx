import { useEffect } from 'react';
import { useGameStore } from './stores/useGameStore';
import { useConnectionStore } from './stores/useConnectionStore';
import { SystemsManager } from './game/SystemsManager';
import LobbyScreen from './components/LobbyScreen';
import AstronautScreen from './components/AstronautScreen';
import MissionControlScreen from './components/MissionControlScreen';

function App() {
  const { phase } = useGameStore();
  const { role, conn } = useConnectionStore();

  useEffect(() => {
    if (!conn) return;

    const handleData = (data: unknown) => {
      try {
        const msg = typeof data === 'string' ? JSON.parse(data) : (data as any);
        if (msg && msg.type === 'gameEvent') {
          if (msg.event === 'fix') {
            SystemsManager.fixSystem(msg.system, msg.amount, true);
          } else if (msg.event === 'penalty') {
            SystemsManager.applyPenalty(msg.system, msg.amount, true);
          }
        }
      } catch (err) {
        console.error('Failed to parse network message:', err);
      }
    };

    conn.on('data', handleData);
    return () => conn.off('data', handleData);
  }, [conn]);

  if (phase === 'lobby') {
    return <LobbyScreen />;
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
