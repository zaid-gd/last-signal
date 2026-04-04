import { useGameStore } from './stores/useGameStore';
import { useConnectionStore } from './stores/useConnectionStore';
import LobbyScreen from './components/LobbyScreen';
import AstronautScreen from './components/AstronautScreen';
import MissionControlScreen from './components/MissionControlScreen';

function App() {
  const { phase } = useGameStore();
  const { role } = useConnectionStore();

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
