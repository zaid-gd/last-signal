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

interface GameStore {
  phase: 'lobby' | 'playing' | 'postgame';
  systemHealth: SystemHealth;
  messages: Message[];
  gameTime: number;
  setPhase: (phase: 'lobby' | 'playing' | 'postgame') => void;
  addMessage: (message: Message) => void;
  setGameTime: (time: number) => void;
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
  setPhase: (phase) => set({ phase }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setGameTime: (time) => set({ gameTime: time }),
}));
