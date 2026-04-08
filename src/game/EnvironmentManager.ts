import { useGameStore } from '../stores/useGameStore';
import { CrisisEngine } from './CrisisEngine';
import type { EnvironmentSeverity } from './types';

export const EnvironmentManager = {
  update() {
    const state = useGameStore.getState();
    const { systemHealth, gameTime } = state;
    const activeEvents = CrisisEngine.getActiveEvents();

    let severity: EnvironmentSeverity = 'nominal';

    const healthValues = Object.values(systemHealth);
    const minHealth = Math.min(...healthValues);
    const avgHealth = healthValues.reduce((a, b) => a + b, 0) / healthValues.length;

    // Progressive severity phases
    if (avgHealth < 20 || minHealth < 10 || gameTime > 540) { 
      // Endgame: Average health critical, any system near failure, or final 60 seconds
      severity = 'endgame';
    } else if (minHealth < 35 || activeEvents.some(e => e.decayRate >= 2.0)) {
      // Critical: Any system below 35% or high-intensity crisis active
      severity = 'critical';
    } else if (minHealth < 75 || activeEvents.length > 0) {
      // Warning: Any system below 75% or any crisis active
      severity = 'warning';
    }

    if (state.environmentSeverity !== severity) {
      state.setEnvironmentSeverity(severity);
    }
  }
};
