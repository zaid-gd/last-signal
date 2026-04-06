import type { SystemKey, ActionType, AudioKey } from './types';

export interface CrisisEvent {
  id: string;
  triggerTime: number;      // seconds from game start
  system: SystemKey;
  decayRate: number;        // health % lost per second while unfixed
  duration: number;         // seconds until auto-fail if unfixed
  fixAction: ActionType;    // which mini-game fixes it
  mcHintText: string;       // text shown to Mission Control 15s before trigger
  astronautCue: string;     // visual cue on ship at trigger time
  audioEvent: AudioKey;     // sound to play at trigger
  navigationCode?: string;  // 6-digit code for NavKeypad
  breakerCombo?: boolean[]; // correct breaker combination
  active?: boolean;
  fixed?: boolean;
}

const CRISIS_TIMELINE: CrisisEvent[] = [
  { 
    id: 'pwr-1',
    triggerTime: 45,  
    system: 'power',       
    decayRate: 0.8,  
    duration: 90,  
    fixAction: 'breakers',  
    mcHintText: 'Power fluctuation in main grid — instruct astronaut to reset breakers',
    astronautCue: 'Warning: Power Grid Fluctuation',
    audioEvent: 'alarmPulse',
    breakerCombo: [true, false, true, false, false, true]
  },
  { 
    id: 'hull-1',
    triggerTime: 120, 
    system: 'hull',        
    decayRate: 1.5,  
    duration: 120, 
    fixAction: 'seal',      
    mcHintText: 'Micro-fracture detected in Hull Sector 4 — seal breach immediately',
    astronautCue: 'Hull Integrity Compromised: Sector 4',
    audioEvent: 'hullCreak'
  },
  { 
    id: 'ls-1',
    triggerTime: 210, 
    system: 'lifeSupport', 
    decayRate: 1.2,  
    duration: 150, 
    fixAction: 'power',     
    mcHintText: 'CO2 scrubbers failing — reroute auxiliary power to Life Support',
    astronautCue: 'Critical: CO2 Levels Rising',
    audioEvent: 'alarmPulse'
  },
  { 
    id: 'nav-1',
    triggerTime: 300, 
    system: 'navigation',  
    decayRate: 2.0,  
    duration: 60,  
    fixAction: 'navcode',   
    mcHintText: 'Off-course drift — input burn sequence code: 482910',
    astronautCue: 'Navigation Error: Course Correction Required',
    audioEvent: 'alarmPulse',
    navigationCode: '482910'
  },
  {
    id: 'comms-1',
    triggerTime: 390,
    system: 'comms',
    decayRate: 0,
    duration: 90,
    fixAction: 'antenna',
    mcHintText: 'Signal degradation — align antenna array to 127°',
    astronautCue: 'Warning: Comms Array Dish Misaligned',
    audioEvent: 'alarmPulse'
  },
  {
    id: 'pwr-hull-2',
    triggerTime: 450,
    system: 'hull',
    decayRate: 2.5,
    duration: 90,
    fixAction: 'seal',
    mcHintText: 'Emergency: Multiple breaches detected — prioritize sector 4',
    astronautCue: 'Critical Alert: Dual System Failure',
    audioEvent: 'criticalAlarm'
  },
  {
    id: 'pwr-2',
    triggerTime: 450,
    system: 'power',
    decayRate: 2.0,
    duration: 90,
    fixAction: 'breakers',
    mcHintText: 'Simultaneous power grid collapse — reset breakers',
    astronautCue: 'Critical Alert: Power Grid Failure',
    audioEvent: 'criticalAlarm',
    breakerCombo: [false, true, true, false, true, true]
  },
  {
    id: 'ls-2',
    triggerTime: 525,
    system: 'lifeSupport',
    decayRate: 3.0,
    duration: 75,
    fixAction: 'power',
    mcHintText: 'Total life support failure — immediate power reroute required',
    astronautCue: 'EXTREME DANGER: LIFE SUPPORT OFFLINE',
    audioEvent: 'criticalAlarm'
  }
];

interface CrisisUpdate {
  newEvents: CrisisEvent[];
  hints: string[];
  upcomingEvents: { event: CrisisEvent, timeToTrigger: number }[];
  activeEvents: CrisisEvent[];
  activeDecays: Record<SystemKey, number>;
}

let activeEvents: CrisisEvent[] = [];
let gameStartTime = 0;
const fixedEventIds = new Set<string>();

export const CrisisEngine = {
  start(startTime: number) {
    gameStartTime = startTime;
    activeEvents = [];
    fixedEventIds.clear();
  },

  tick(now: number): CrisisUpdate {
    const elapsed = (now - gameStartTime) / 1000;
    const update: CrisisUpdate = {
      newEvents: [],
      hints: [],
      upcomingEvents: [],
      activeEvents: activeEvents,
      activeDecays: {
        hull: 0,
        lifeSupport: 0,
        power: 0,
        navigation: 0,
        comms: 0
      }
    };

    CRISIS_TIMELINE.forEach(event => {
      // Hints show 15s before trigger
      if (elapsed >= event.triggerTime - 15 && elapsed < event.triggerTime && !fixedEventIds.has(event.id)) {
        const timeToTrigger = Math.ceil(event.triggerTime - elapsed);
        update.upcomingEvents.push({ event, timeToTrigger });
        if (!update.hints.includes(event.mcHintText)) {
          update.hints.push(`[UPCOMING in ${timeToTrigger}s] ${event.mcHintText}`);
        }
      }

      // Trigger events
      if (elapsed >= event.triggerTime && !fixedEventIds.has(event.id)) {
        const isActive = activeEvents.some(ae => ae.id === event.id);
        if (!isActive) {
          activeEvents.push({ ...event, active: true });
          update.newEvents.push(event);
        }
        
        // Decay
        update.activeDecays[event.system] += event.decayRate;
      }
    });

    return update;
  },

  reportFixed(eventId: string): void {
    fixedEventIds.add(eventId);
    activeEvents = activeEvents.filter(e => e.id !== eventId);
  },

  reportFixedForSystem(system: SystemKey): void {
    const fixedIds = activeEvents
      .filter(event => event.system === system)
      .map(event => event.id);

    fixedIds.forEach(eventId => fixedEventIds.add(eventId));
    activeEvents = activeEvents.filter(event => event.system !== system);
  },

  getNavigationCode(eventId: string = 'nav-1'): string {
    const event = CRISIS_TIMELINE.find(e => e.id === eventId);
    return event?.navigationCode || '000000';
  },

  validateNavigationCode(code: string, eventId: string = 'nav-1'): boolean {
    const event = CRISIS_TIMELINE.find(e => e.id === eventId);
    return code === (event?.navigationCode || '000000');
  },

  getAntennaTargetDegrees(eventId: string = 'comms-1'): number {
    // Extract degrees from hint text or use default
    const event = CRISIS_TIMELINE.find(e => e.id === eventId);
    if (event?.mcHintText) {
      const match = event.mcHintText.match(/(\d+)°/);
      if (match) return parseInt(match[1], 10);
    }
    return 127; // Default from timeline
  },

  getBreakerCombo(eventId: string = 'pwr-1'): boolean[] {
    const event = CRISIS_TIMELINE.find(e => e.id === eventId);
    return event?.breakerCombo || [false, false, false, false, false, false];
  },

  getActiveEventForSystem(system: SystemKey): CrisisEvent | undefined {
    return activeEvents.find(event => event.system === system);
  },

  getActiveEvents(): CrisisEvent[] {
    return [...activeEvents];
  },

  getUpcomingEvents(now: number): { event: CrisisEvent, timeToTrigger: number }[] {
    const elapsed = (now - gameStartTime) / 1000;

    return CRISIS_TIMELINE.flatMap(event => {
      if (
        elapsed >= event.triggerTime - 15 &&
        elapsed < event.triggerTime &&
        !fixedEventIds.has(event.id)
      ) {
        return [{ event, timeToTrigger: Math.ceil(event.triggerTime - elapsed) }];
      }

      return [];
    });
  },

  getActiveBreakerCombo(): boolean[] {
    const event = activeEvents.find(activeEvent => activeEvent.system === 'power' && activeEvent.breakerCombo);
    return event?.breakerCombo ?? this.getBreakerCombo();
  }
};
