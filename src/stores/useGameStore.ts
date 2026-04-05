import { create } from 'zustand';

interface Message {
  type: string;
  text: string;
  sentAt: number;
  from: string;
}

interface SystemHealth {
  hull: number;
  lifeSupport: number;
  power: number;
  navigation: number;
  comms: number;
}

type SystemKey = keyof SystemHealth;

interface GameStore {
  phase: 'lobby' | 'playing' | 'postgame';
  systemHealth: SystemHealth;
  messages: Message[];
  gameTime: number;
  /** Chat / signal delay in seconds (AntennaWheel restores to 10 from crisis spike) */
  commsDelaySeconds: number;
  /** Currently active mini game, null if none */
  activeMiniGame: SystemKey | null;
  setPhase: (phase: 'lobby' | 'playing' | 'postgame') => void;
  addMessage: (message: Message) => void;
  setGameTime: (time: number) => void;
  setCommsDelaySeconds: (seconds: number) => void;
  setActiveMiniGame: (miniGame: SystemKey | null) => void;
}

export const useGameStore = create<GameStore>((set) => ({
  phase: 'lobby',
  systemHealth: {
    hull: 100,
    lifeSupport: 100,
    power: 100,
    navigation: 100,
    comms: 100,
  },
  messages: [],
  gameTime: 0,
  commsDelaySeconds: 10,
  activeMiniGame: null,
  setPhase: (phase) => set({ phase }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setGameTime: (time) => set({ gameTime: time }),
  setCommsDelaySeconds: (seconds) =>
    set({ commsDelaySeconds: Math.max(5, Math.min(120, Math.round(seconds))) }),
  setActiveMiniGame: (miniGame) => set({ activeMiniGame: miniGame }),
}));
