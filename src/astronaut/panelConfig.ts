import type { SystemKey } from '../stores/useGameStore';

export type Vector3Tuple = [number, number, number];

export interface PanelConfig {
  key: SystemKey;
  position: Vector3Tuple;
  rotation: Vector3Tuple;
}

/** Canonical panel positions for the ship corridor. */
export const PANEL_CONFIGS: PanelConfig[] = [
  { key: 'hull',        position: [-1.7, 1.3, -4],  rotation: [0,  Math.PI / 2, 0] },
  { key: 'lifeSupport', position: [ 1.7, 1.3, -8],  rotation: [0, -Math.PI / 2, 0] },
  { key: 'power',       position: [-1.7, 1.3, -12], rotation: [0,  Math.PI / 2, 0] },
  { key: 'navigation',  position: [ 1.7, 1.3, -16], rotation: [0, -Math.PI / 2, 0] },
  { key: 'comms',       position: [-1.7, 1.3, -20], rotation: [0,  Math.PI / 2, 0] },
];

/**
 * Derive the emergency light position for a panel:
 * directly above the status LED (0.8 m up, 0.3 m out from the wall).
 */
export function panelLightPosition(cfg: PanelConfig): Vector3Tuple {
  const wallSide = cfg.position[0] > 0 ? -0.3 : 0.3; // offset away from wall
  return [cfg.position[0] + wallSide, cfg.position[1] + 0.9, cfg.position[2]];
}
