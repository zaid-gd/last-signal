import { create } from 'zustand';
import type { EnvironmentSeverity } from '../game/types';

export interface Message {
  type: string;
  text: string;
  sentAt: number;
  from: string;
}

export interface SystemHealth {
  hull: number;
  lifeSupport: number;
  power: number;
  navigation: number;
  comms: number;
}

export type SystemKey = keyof SystemHealth;

interface GameStore {
  phase: 'lobby' | 'playing' | 'postgame';
  environmentSeverity: EnvironmentSeverity;
  systemHealth: SystemHealth;
  messages: Message[];
  gameTime: number;
  /** Chat / signal delay in seconds (AntennaWheel restores to 10 from crisis spike) */
  commsDelaySeconds: number;
  /** Currently active mini game, null if none */
  activeMiniGame: SystemKey | null;
  nearestSystem: SystemKey | null;
  lastMiniGameClose: number;
  gameEndReason?: string;
  setPhase: (phase: 'lobby' | 'playing' | 'postgame') => void;
  setEnvironmentSeverity: (severity: EnvironmentSeverity) => void;
  addMessage: (message: Message) => void;
  setGameTime: (time: number) => void;
  setCommsDelaySeconds: (seconds: number) => void;
  setActiveMiniGame: (miniGame: SystemKey | null) => void;
  setNearestSystem: (system: SystemKey | null) => void;
  setGameEndReason: (reason: string) => void;
  resetMovement: () => void;
  evaState: 'interior' | 'transitioning_out' | 'exterior' | 'transitioning_in';
  setEvaState: (state: 'interior' | 'transitioning_out' | 'exterior' | 'transitioning_in') => void;
  enableRetroFilter: boolean;
  toggleRetroFilter: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'lobby',
  environmentSeverity: 'nominal',
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
  nearestSystem: null,
  lastMiniGameClose: 0,
  gameEndReason: undefined,
  setPhase: (phase) => set({ phase }),
  setEnvironmentSeverity: (severity) => set({ environmentSeverity: severity }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setGameTime: (time) => set({ gameTime: time }),
  setCommsDelaySeconds: (seconds) =>
    set({ commsDelaySeconds: Math.max(5, Math.min(120, Math.round(seconds))) }),
  setActiveMiniGame: (miniGame) => {
    const current = get().activeMiniGame;
    // If closing, record the time
    if (current && !miniGame) {
      set({ activeMiniGame: null, lastMiniGameClose: Date.now() });
    } else {
      set({ activeMiniGame: miniGame });
    }
  },
  setNearestSystem: (system) => set({ nearestSystem: system }),
  setGameEndReason: (reason) => set({ gameEndReason: reason }),
  resetMovement: () => set({}),
  evaState: 'interior',
  setEvaState: (state) => set({ evaState: state }),
  enableRetroFilter: true,
  toggleRetroFilter: () => set((state) => ({ enableRetroFilter: !state.enableRetroFilter })),
}));
