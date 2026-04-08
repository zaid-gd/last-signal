import { useGameStore } from '../stores/useGameStore';
import { useConnectionStore } from '../stores/useConnectionStore';
import { AudioEngine } from '../audio/AudioEngine';
import { CrisisEngine } from './CrisisEngine';
import { SystemsManager } from './SystemsManager';
import { EnvironmentManager } from './EnvironmentManager';
import type { SystemKey } from './types';

let animationFrameId: number | null = null;
let lastTickTime = 0;

export const GameLoop = {
  start() {
    this.stop();

    const startTime = Date.now();
    lastTickTime = startTime;
    CrisisEngine.start(startTime);

    const tick = () => {
      const now = Date.now();
      const delta = (now - lastTickTime) / 1000;
      lastTickTime = now;

      // 1. Update game time in store
      useGameStore.setState((state) => ({
        gameTime: state.gameTime + delta
      }));

      // 2. Crisis Engine tick
      const { newEvents, activeDecays } = CrisisEngine.tick(now);

      if (newEvents.some(event => event.system === 'comms')) {
        useGameStore.getState().setCommsDelaySeconds(20);
      }

      // 3. Apply decays to systems
      Object.entries(activeDecays).forEach(([system, rate]) => {
        if (rate > 0) {
          SystemsManager.applyPenalty(system as SystemKey, rate * delta, true);
        }
      });

      // 4. Update environment state
      EnvironmentManager.update();

      // 5. Check lose conditions
      const state = useGameStore.getState();
      const failedSystem = Object.entries(state.systemHealth).find(([, health]) => health <= 0);

      if (failedSystem) {
        const { role, conn } = useConnectionStore.getState();

        if (role === 'astronaut') {
          if (conn) {
            conn.send(JSON.stringify({
              type: 'gameEvent',
              payload: { event: 'GAME_OVER', reason: failedSystem[0] },
              sentAt: Date.now()
            }));
            conn.send(JSON.stringify({
              type: 'gameOverImmediate',
              payload: { reason: failedSystem[0] },
              sentAt: Date.now()
            }));
          }
        }
        useGameStore.setState({ phase: 'postgame', gameEndReason: failedSystem[0] });
        this.stop();
        return;
      }

      // 6. Dynamic Alarms
      AudioEngine.updateAlarms(useGameStore.getState().systemHealth);

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
  },

  stop() {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }
};
