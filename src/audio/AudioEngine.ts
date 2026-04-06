import { useConnectionStore } from '../stores/useConnectionStore';
import type { SystemHealth } from '../stores/useGameStore';

interface WebAudioWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}

class AudioEngineImpl {
  private ctx: AudioContext | null = null;
  private currentAlarm: 'none' | 'warning' | 'critical' = 'none';
  private osc: OscillatorNode | null = null;
  private lfo: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;
  private masterGain: GainNode | null = null;

  private init() {
    if (!this.ctx) {
      try {
        const AudioContextClass = window.AudioContext || (window as WebAudioWindow).webkitAudioContext;
        if (AudioContextClass) {
          this.ctx = new AudioContextClass();
        }
      } catch {
        // AudioContext not supported
      }
    }
    // Try to resume if suspended (browser autoplay policy)
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private stopCurrent() {
    if (this.osc) {
      try {
        this.osc.stop();
      } catch {
        // Oscillator may already be stopped.
      }
      this.osc.disconnect();
      this.osc = null;
    }
    if (this.lfo) {
      try {
        this.lfo.stop();
      } catch {
        // Oscillator may already be stopped.
      }
      this.lfo.disconnect();
      this.lfo = null;
    }
    if (this.lfoGain) {
      this.lfoGain.disconnect();
      this.lfoGain = null;
    }
    if (this.masterGain) {
      this.masterGain.disconnect();
      this.masterGain = null;
    }
  }

  private playTone(freq: number, type: OscillatorType, lfoFreq: number, baseVol: number) {
    this.init();
    if (!this.ctx) return;
    this.stopCurrent();

    this.osc = this.ctx.createOscillator();
    this.masterGain = this.ctx.createGain();
    
    this.osc.type = type;
    this.osc.frequency.value = freq;

    const role = useConnectionStore.getState().role;
    const volMod = role === 'missionControl' ? 0.4 : 1.0;
    this.masterGain.gain.value = baseVol * volMod;

    // Create LFO for pulsing effect
    this.lfo = this.ctx.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = lfoFreq;
    
    this.lfoGain = this.ctx.createGain();
    this.lfoGain.gain.value = baseVol * volMod; // Modulate gain

    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.masterGain.gain);
    
    this.osc.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
    
    this.osc.start();
    this.lfo.start();
  }

  public updateAlarms(systemHealth: SystemHealth) {
    let critical = false;
    let warning = false;

    // Determine current state based on health thresholds
    for (const h of Object.values(systemHealth)) {
      if (h < 30) critical = true;
      else if (h < 60) warning = true;
    }

    const needed: 'none' | 'warning' | 'critical' = critical ? 'critical' : (warning ? 'warning' : 'none');
    
    // Check if we fixed something and need to play a chime
    if ((this.currentAlarm === 'critical' || this.currentAlarm === 'warning') && needed === 'none') {
      this.playSuccessChime();
    } else if (this.currentAlarm === 'critical' && needed === 'warning') {
       // Also chime if downgrading severity (i.e., fixed the critical issue but a warning remains)
       this.playSuccessChime();
    }

    if (this.currentAlarm !== needed) {
      this.currentAlarm = needed;
      if (needed === 'critical') {
        // Fast, harsh pulse
        this.playTone(800, 'square', 8, 0.5); 
      } else if (needed === 'warning') {
        // Slower, softer pulse
        this.playTone(600, 'sine', 2, 0.3);
      } else {
        this.stopCurrent();
      }
    }
  }

  public playSuccessChime() {
    this.init();
    if (!this.ctx) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    
    // Play a rising major arpeggio
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
    osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
    osc.frequency.setValueAtTime(1046.50, now + 0.3); // C6

    const role = useConnectionStore.getState().role;
    gain.gain.value = role === 'missionControl' ? 0.4 : 1.0;
    
    // Fade out quickly
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(now);
    osc.stop(now + 1);
  }
}

export const AudioEngine = new AudioEngineImpl();
