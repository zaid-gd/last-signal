import { useGameStore } from '../stores/useGameStore';
import { CrisisEngine } from './CrisisEngine';
import { SystemsManager } from './SystemsManager';

let animationFrameId: number | null = null;
let lastTickTime = 0;

export const GameLoop = {
  start() {
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
      const { activeDecays } = CrisisEngine.tick(now);

      // 3. Apply decays to systems
      Object.entries(activeDecays).forEach(([system, rate]) => {
        if (rate > 0) {
          SystemsManager.applyPenalty(system as any, rate * delta);
        }
      });

      // 4. Check lose conditions
      const state = useGameStore.getState();
      const failedSystem = Object.entries(state.systemHealth).find(([_, health]) => health <= 0);
      
      if (failedSystem) {
        console.log(`GAME OVER: ${failedSystem[0]} failure`);
        useGameStore.setState({ phase: 'postgame' });
        this.stop();
        return;
      }

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
