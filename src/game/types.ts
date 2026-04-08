export type SystemKey = 'hull' | 'lifeSupport' | 'power' | 'navigation' | 'comms';

export type ActionType = 'seal' | 'power' | 'breakers' | 'navcode' | 'antenna';

export type EnvironmentSeverity = 'nominal' | 'warning' | 'critical' | 'endgame';

export type AudioKey = 
  | 'hullCreak' 
  | 'alarmPulse' 
  | 'criticalAlarm' 
  | 'breatherHiss' 
  | 'evaStatic' 
  | 'panelClick' 
  | 'successChime'
  | 'messageSent'
  | 'messageReceive'
  | 'transmitting'
  | 'terminalType'
  | 'alertIncoming';
