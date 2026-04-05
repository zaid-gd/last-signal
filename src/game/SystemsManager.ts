import { useGameStore } from '../stores/useGameStore';
import { useConnectionStore } from '../stores/useConnectionStore';
import type { SystemKey } from './types';

export const SystemsManager = {
  fixSystem(system: SystemKey, amount: number, fromRemote: boolean = false): void {
    // 1. Update local state
    useGameStore.setState((s) => ({
      systemHealth: {
        ...s.systemHealth,
        [system]: Math.min(100, s.systemHealth[system] + amount),
      },
    }));

    // 2. If this was a local action, sync it to the partner
    if (!fromRemote) {
      const { conn } = useConnectionStore.getState();
      if (conn) {
        conn.send(JSON.stringify({
          type: 'gameEvent',
          event: 'fix',
          system,
          amount,
          sentAt: Date.now()
        }));
      }
    }
  },

  applyPenalty(system: SystemKey, amount: number, fromRemote: boolean = false): void {
    // 1. Update local state
    useGameStore.setState((s) => ({
      systemHealth: {
        ...s.systemHealth,
        [system]: Math.max(0, s.systemHealth[system] - amount),
      },
    }));

    // 2. If this was a local penalty (e.g. mini-game fail), sync it
    if (!fromRemote) {
      const { conn } = useConnectionStore.getState();
      if (conn) {
        conn.send(JSON.stringify({
          type: 'gameEvent',
          event: 'penalty',
          system,
          amount,
          sentAt: Date.now()
        }));
      }
    }
  },
};
