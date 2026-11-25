import { CarCatalogItem } from '../types/game';

class DriftAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;
  private turboOsc: OscillatorNode | null = null;
  private turboGain: GainNode | null = null;
  private screechSource: AudioBufferSourceNode | null = null;
  private screechFilter: BiquadFilterNode | null = null;
  private screechGain: GainNode | null = null;
  private muted = false;
  private initialized = false;
  private lastThrottle = 0;
  private lastTurboLoad = 0;
  private running = false;

  public init() {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : 0.35;
    this.masterGain.connect(this.ctx.destination);

    // Engine dual-oscillator synth
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 340;
    this.engineFilter.Q.value = 2.5;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;

    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.value = 55;

    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.value = 110;

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.engineOsc1.start();
    this.engineOsc2.start();

    // Turbo whine
    this.turboOsc = this.ctx.createOscillator();
    this.turboOsc.type = 'sine';
    this.turboOsc.frequency.value = 900;
    this.turboGain = this.ctx.createGain();
    this.turboGain.gain.value = 0;
    this.turboOsc.connect(this.turboGain);
    this.turboGain.connect(this.masterGain);
    this.turboOsc.start();

    // Tire screech noise buffer
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.screechSource = this.ctx.createBufferSource();
    this.screechSource.buffer = noiseBuffer;
    this.screechSource.loop = true;

    this.screechFilter = this.ctx.createBiquadFilter();
    this.screechFilter.type = 'bandpass';
    this.screechFilter.frequency.value = 1350;
    this.screechFilter.Q.value = 5.5;

    this.screechGain = this.ctx.createGain();
    this.screechGain.gain.value = 0;

    this.screechSource.connect(this.screechFilter);
    this.screechFilter.connect(this.screechGain);
    this.screechGain.connect(this.masterGain);
    this.screechSource.start();

    this.initialized = true;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.35, this.ctx.currentTime, 0.04);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public startDriving() {
    this.init();
    this.running = true;
  }

  public stopDriving() {
    this.running = false;
    if (!this.ctx || !this.engineGain || !this.screechGain || !this.turboGain) return;
    const now = this.ctx.currentTime;
    this.engineGain.gain.setTargetAtTime(0, now, 0.08);
    this.screechGain.gain.setTargetAtTime(0, now, 0.08);
    this.turboGain.gain.setTargetAtTime(0, now, 0.08);
  }

  public updateDriving(params: {
    rpmRatio: number; // 0..1
    throttle: number; // 0..1
    slipIntensity: number; // 0..1
    engineType: CarCatalogItem['engineSoundType'];
    engineTier: number;
    turboTier: number;
  }) {
    if (!this.running || !this.ctx || !this.engineOsc1 || !this.engineOsc2 || !this.engineFilter || !this.engineGain || !this.screechGain || !this.screechFilter || !this.turboOsc || !this.turboGain) {
      return;
    }

    const now = this.ctx.currentTime;
    const basePitchMap: Record<CarCatalogItem['engineSoundType'], number> = {
      kei: 72,
      i4: 58,
      rotary: 88,
      v8: 44,
      hyper: 76,
    };

    const baseHz = basePitchMap[params.engineType] ?? 58;
    const harmonic = params.engineType === 'v8' ? 1.5 : params.engineType === 'rotary' ? 2.0 : 2.0;
    const rpmHz = baseHz + params.rpmRatio * baseHz * (2.6 + params.engineTier * 0.25);

    this.engineOsc1.frequency.setTargetAtTime(rpmHz, now, 0.03);
    this.engineOsc2.frequency.setTargetAtTime(rpmHz * harmonic, now, 0.03);

    const filterCutoff = 280 + params.rpmRatio * 1400 + params.throttle * 650 + params.engineTier * 260;
    this.engineFilter.frequency.setTargetAtTime(filterCutoff, now, 0.04);

    const engineVol = 0.09 + params.throttle * 0.14 + params.rpmRatio * 0.08;
    this.engineGain.gain.setTargetAtTime(engineVol, now, 0.04);

    // Turbo spool & blow-off valve
    if (params.turboTier > 0) {
      const turboTarget = params.throttle * params.rpmRatio * (0.015 + params.turboTier * 0.012);
      this.turboOsc.frequency.setTargetAtTime(1100 + params.rpmRatio * 2400, now, 0.05);
      this.turboGain.gain.setTargetAtTime(turboTarget, now, 0.05);

      // Blow-off flutter on sudden throttle lift at high boost
      if (this.lastThrottle > 0.65 && params.throttle < 0.2 && this.lastTurboLoad > 0.5) {
        this.playBlowOff();
      }
      this.lastTurboLoad = params.rpmRatio * params.throttle;
    } else {
      this.turboGain.gain.setTargetAtTime(0, now, 0.05);
    }

    // Backfire pop on race exhaust lift
    if (params.engineTier >= 2 && this.lastThrottle > 0.8 && params.throttle < 0.1 && params.rpmRatio > 0.72) {
      this.playBackfire();
    }
    this.lastThrottle = params.throttle;

    // Tire screech
    const screechVol = Math.min(0.22, Math.max(0, params.slipIntensity * 0.2));
    this.screechFilter.frequency.setTargetAtTime(1150 + params.slipIntensity * 650, now, 0.04);
    this.screechGain.gain.setTargetAtTime(screechVol, now, 0.04);
  }

  public playBlowOff() {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(2400, now);
    osc.frequency.exponentialRampToValueAtTime(650, now + 0.16);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  public playBackfire() {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(130, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.09);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  public playChime(type: 'unlock' | 'zone' | 'click' | 'initiate') {
    this.init();
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (type === 'unlock') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.08);
      osc.frequency.setValueAtTime(783.99, now + 0.16);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === 'zone') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(680, now);
      osc.frequency.exponentialRampToValueAtTime(1020, now + 0.12);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.23);
    } else if (type === 'initiate') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(540, now + 0.09);
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.15);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.07);
    }
  }
}

export const driftAudio = new DriftAudioEngine();
