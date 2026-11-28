import { CarCatalogItem } from '../types/game';

type EngineType = CarCatalogItem['engineSoundType'];
type VoiceId = 'kei' | 'i4' | 'i4_sport' | 'i6' | 'v8' | 'rotary' | 'flat4';

// Karakter suara tiap mesin. Frekuensi dasar = (rpm / 60) * firePerRev (jumlah ledakan per putaran).
// Makin banyak silinder = nada makin tinggi & halus; V8 = rumble dalam + burble tidak rata.
interface EngineVoice {
  idleRpm: number;
  redlineRpm: number;
  firePerRev: number;
  waves: [OscillatorType, OscillatorType, OscillatorType];
  ratios: [number, number, number]; // pengali frekuensi tiap osilator terhadap frekuensi ledakan
  mix: [number, number, number];
  drive: number; // distorsi (growl)
  cutBase: number;
  cutRpm: number;
  cutThrottle: number;
  q: number;
  burble: number; // kedalaman modulasi amplitudo (lope / brap)
  burbleRate: number; // kelipatan putaran mesin
  noise: number; // level desis/raungan knalpot
  noiseHz: number;
  gain: number;
  pops: number; // jumlah letupan saat gas dilepas di RPM tinggi
  popPitch: number;
}

const VOICES: Record<VoiceId, EngineVoice> = {
  // Mesin kecil 3-silinder: tinny, cempreng, ringan
  kei: {
    idleRpm: 1100, redlineRpm: 8200, firePerRev: 1.5,
    waves: ['sawtooth', 'square', 'triangle'], ratios: [1, 2, 0.5], mix: [0.5, 0.18, 0.1],
    drive: 0.3, cutBase: 500, cutRpm: 1800, cutThrottle: 700, q: 3,
    burble: 0.08, burbleRate: 1, noise: 0.02, noiseHz: 2200, gain: 0.85, pops: 0, popPitch: 160,
  },
  // Stock 4-silinder: bersih, standar
  i4: {
    idleRpm: 900, redlineRpm: 7200, firePerRev: 2,
    waves: ['sawtooth', 'triangle', 'triangle'], ratios: [1, 2, 0.5], mix: [0.5, 0.25, 0.2],
    drive: 0.5, cutBase: 380, cutRpm: 1500, cutThrottle: 650, q: 2.5,
    burble: 0.05, burbleRate: 1, noise: 0.04, noiseHz: 1800, gain: 1.0, pops: 0, popPitch: 150,
  },
  // Stroker / built 4-silinder: lebih galak, knalpot terbuka, sesekali pop
  i4_sport: {
    idleRpm: 950, redlineRpm: 7800, firePerRev: 2,
    waves: ['sawtooth', 'sawtooth', 'triangle'], ratios: [1, 2, 0.5], mix: [0.5, 0.2, 0.2],
    drive: 1.4, cutBase: 520, cutRpm: 2300, cutThrottle: 800, q: 3,
    burble: 0.1, burbleRate: 1, noise: 0.07, noiseHz: 1700, gain: 1.05, pops: 1, popPitch: 130,
  },
  // 2JZ / 1JZ inline-6: halus, bernada tinggi, teriak panjang ke redline
  i6: {
    idleRpm: 900, redlineRpm: 8200, firePerRev: 3,
    waves: ['sawtooth', 'triangle', 'sine'], ratios: [1, 2, 0.5], mix: [0.45, 0.3, 0.25],
    drive: 1.2, cutBase: 450, cutRpm: 2600, cutThrottle: 900, q: 2,
    burble: 0.04, burbleRate: 1, noise: 0.07, noiseHz: 1600, gain: 1.1, pops: 2, popPitch: 120,
  },
  // V8 (LS / Mustang): rumble dalam, lope saat idle, burble & letupan beruntun
  v8: {
    idleRpm: 800, redlineRpm: 6800, firePerRev: 4,
    waves: ['sawtooth', 'triangle', 'square'], ratios: [1, 0.5, 2], mix: [0.5, 0.42, 0.12],
    drive: 2.6, cutBase: 300, cutRpm: 1700, cutThrottle: 800, q: 1.6,
    burble: 0.5, burbleRate: 1, noise: 0.14, noiseHz: 900, gain: 1.25, pops: 4, popPitch: 85,
  },
  // Rotary: raungan tinggi, buzzy, brap-brap
  rotary: {
    idleRpm: 1100, redlineRpm: 9000, firePerRev: 3,
    waves: ['sawtooth', 'square', 'sawtooth'], ratios: [1, 2, 3], mix: [0.35, 0.18, 0.14],
    drive: 1.8, cutBase: 900, cutRpm: 4200, cutThrottle: 1500, q: 4,
    burble: 0.16, burbleRate: 2, noise: 0.09, noiseHz: 3200, gain: 0.95, pops: 2, popPitch: 190,
  },
  // Modern boxer/4-silinder tuned (GR86 dan sejenisnya): rumble datar khas boxer
  flat4: {
    idleRpm: 900, redlineRpm: 7600, firePerRev: 2,
    waves: ['sawtooth', 'triangle', 'triangle'], ratios: [1, 0.5, 2], mix: [0.5, 0.3, 0.15],
    drive: 1.6, cutBase: 420, cutRpm: 2000, cutThrottle: 750, q: 2.2,
    burble: 0.22, burbleRate: 0.5, noise: 0.06, noiseHz: 1500, gain: 1.0, pops: 1, popPitch: 110,
  },
};

class DriftAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private engineOscs: OscillatorNode[] = [];
  private engineMix: GainNode[] = [];
  private engineShaper: WaveShaperNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private burbleGain: GainNode | null = null;
  private burbleLfo: OscillatorNode | null = null;
  private burbleDepth: GainNode | null = null;
  private engineGain: GainNode | null = null;
  private exhaustFilter: BiquadFilterNode | null = null;
  private exhaustGain: GainNode | null = null;
  private turboOsc: OscillatorNode | null = null;
  private turboGain: GainNode | null = null;
  private screechSource: AudioBufferSourceNode | null = null;
  private screechFilter: BiquadFilterNode | null = null;
  private screechGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted = false;
  private initialized = false;
  private lastThrottle = 0;
  private lastTurboLoad = 0;
  private running = false;
  private voiceId: VoiceId | null = null;
  private lastPopTime = 0;

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

    // Mesin: 3 osilator -> mixer -> distorsi -> filter -> burble (AM) -> gain
    this.engineShaper = this.ctx.createWaveShaper();
    this.engineShaper.oversample = '2x';
    this.engineShaper.curve = this.makeCurve(VOICES.i4.drive);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 340;
    this.engineFilter.Q.value = 2.5;

    this.burbleGain = this.ctx.createGain();
    this.burbleGain.gain.value = 1;
    this.burbleLfo = this.ctx.createOscillator();
    this.burbleLfo.type = 'sine';
    this.burbleLfo.frequency.value = 15;
    this.burbleDepth = this.ctx.createGain();
    this.burbleDepth.gain.value = 0;
    this.burbleLfo.connect(this.burbleDepth);
    this.burbleDepth.connect(this.burbleGain.gain);
    this.burbleLfo.start();

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;

    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 55;
      const mix = this.ctx.createGain();
      mix.gain.value = 0.3;
      osc.connect(mix);
      mix.connect(this.engineShaper);
      osc.start();
      this.engineOscs.push(osc);
      this.engineMix.push(mix);
    }
    this.engineShaper.connect(this.engineFilter);
    this.engineFilter.connect(this.burbleGain);
    this.burbleGain.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    // Turbo whine
    this.turboOsc = this.ctx.createOscillator();
    this.turboOsc.type = 'sine';
    this.turboOsc.frequency.value = 900;
    this.turboGain = this.ctx.createGain();
    this.turboGain.gain.value = 0;
    this.turboOsc.connect(this.turboGain);
    this.turboGain.connect(this.masterGain);
    this.turboOsc.start();

    // Noise buffer (dipakai untuk ban, knalpot, dan letupan)
    const bufferSize = this.ctx.sampleRate * 2;
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    // Tire screech
    this.screechSource = this.ctx.createBufferSource();
    this.screechSource.buffer = this.noiseBuffer;
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

    // Raungan knalpot (noise terfilter, makin keras saat gas dalam)
    const exhaustSource = this.ctx.createBufferSource();
    exhaustSource.buffer = this.noiseBuffer;
    exhaustSource.loop = true;
    this.exhaustFilter = this.ctx.createBiquadFilter();
    this.exhaustFilter.type = 'lowpass';
    this.exhaustFilter.frequency.value = 1200;
    this.exhaustFilter.Q.value = 0.8;
    this.exhaustGain = this.ctx.createGain();
    this.exhaustGain.gain.value = 0;
    exhaustSource.connect(this.exhaustFilter);
    this.exhaustFilter.connect(this.exhaustGain);
    this.exhaustGain.connect(this.masterGain);
    exhaustSource.start();

    this.initialized = true;
  }

  private makeCurve(drive: number): Float32Array<ArrayBuffer> {
    const n = 1024;
    const curve = new Float32Array(new ArrayBuffer(n * 4));
    const k = 1 + drive * 5;
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = Math.tanh(x * k) / Math.tanh(k);
    }
    return curve;
  }

  // Pilih karakter suara: swap mesin menentukan suara (tier 3 = V8, tier 2 = inline-6),
  // selain itu ikut jenis mesin bawaan mobil.
  private pickVoice(type: EngineType, tier: number): VoiceId {
    if (type === 'v8' || tier >= 3) return 'v8';
    if (tier === 2) return 'i6';
    if (type === 'rotary') return 'rotary';
    if (tier === 1) return type === 'kei' ? 'i4' : 'i4_sport';
    if (type === 'kei') return 'kei';
    if (type === 'hyper') return 'flat4';
    return 'i4';
  }

  private applyVoice(id: VoiceId) {
    if (!this.ctx || !this.engineShaper || !this.engineFilter) return;
    const v = VOICES[id];
    const now = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      this.engineOscs[i].type = v.waves[i];
      this.engineMix[i].gain.setTargetAtTime(v.mix[i], now, 0.05);
    }
    this.engineShaper.curve = this.makeCurve(v.drive);
    this.engineFilter.Q.setTargetAtTime(v.q, now, 0.05);
    this.voiceId = id;
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
    this.exhaustGain?.gain.setTargetAtTime(0, now, 0.08);
    this.burbleDepth?.gain.setTargetAtTime(0, now, 0.08);
  }

  public updateDriving(params: {
    rpmRatio: number; // 0..1
    throttle: number; // 0..1
    slipIntensity: number; // 0..1
    engineType: CarCatalogItem['engineSoundType'];
    engineTier: number;
    turboTier: number;
  }) {
    if (
      !this.running || !this.ctx || this.engineOscs.length < 3 || !this.engineFilter || !this.engineGain ||
      !this.screechGain || !this.screechFilter || !this.turboOsc || !this.turboGain ||
      !this.burbleLfo || !this.burbleDepth || !this.exhaustFilter || !this.exhaustGain
    ) {
      return;
    }

    const now = this.ctx.currentTime;
    const id = this.pickVoice(params.engineType, params.engineTier);
    if (id !== this.voiceId) this.applyVoice(id);
    const v = VOICES[id];

    // RPM fisika (kira-kira 0.18..1.0 dari maxRpm) dipetakan ke rentang RPM suara mesin ini
    const norm = Math.min(1, Math.max(0, (params.rpmRatio - 0.18) / 0.82));
    const rpm = v.idleRpm + norm * (v.redlineRpm - v.idleRpm);
    const revHz = rpm / 60;
    const fireHz = revHz * v.firePerRev;

    for (let i = 0; i < 3; i++) {
      this.engineOscs[i].frequency.setTargetAtTime(fireHz * v.ratios[i], now, 0.03);
    }

    // Burble / lope: V8 bergetar kasar saat idle & RPM rendah, makin halus di RPM tinggi
    const burbleDepth = v.burble * (1 - norm * 0.7) * (0.55 + (1 - params.throttle) * 0.45);
    this.burbleLfo.frequency.setTargetAtTime(revHz * v.burbleRate, now, 0.05);
    this.burbleDepth.gain.setTargetAtTime(burbleDepth, now, 0.05);

    const filterCutoff = v.cutBase + norm * v.cutRpm + params.throttle * v.cutThrottle + params.engineTier * 120;
    this.engineFilter.frequency.setTargetAtTime(filterCutoff, now, 0.04);

    const engineVol = v.gain * (0.08 + params.throttle * 0.13 + norm * 0.08);
    this.engineGain.gain.setTargetAtTime(engineVol, now, 0.04);

    // Raungan knalpot: keras saat gas dalam & RPM tinggi
    this.exhaustFilter.frequency.setTargetAtTime(v.noiseHz + norm * 1200, now, 0.05);
    this.exhaustGain.gain.setTargetAtTime(
      v.noise * (0.25 + params.throttle * 0.75) * (0.4 + norm * 0.6),
      now,
      0.05,
    );

    // Turbo spool & blow-off valve
    if (params.turboTier > 0) {
      const turboTarget = params.throttle * params.rpmRatio * (0.015 + params.turboTier * 0.012);
      this.turboOsc.frequency.setTargetAtTime(1100 + params.rpmRatio * 2400, now, 0.05);
      this.turboGain.gain.setTargetAtTime(turboTarget, now, 0.05);

      if (this.lastThrottle > 0.65 && params.throttle < 0.2 && this.lastTurboLoad > 0.5) {
        this.playBlowOff();
      }
      this.lastTurboLoad = params.rpmRatio * params.throttle;
    } else {
      this.turboGain.gain.setTargetAtTime(0, now, 0.05);
    }

    // Letupan knalpot saat gas dilepas di RPM tinggi (V8 / rotary / mesin swap)
    const poppy = id === 'v8' || id === 'rotary' || id === 'i6' || id === 'i4_sport' || params.engineTier >= 2;
    if (
      poppy &&
      this.lastThrottle > 0.75 &&
      params.throttle < 0.1 &&
      norm > 0.55 &&
      now - this.lastPopTime > 0.35
    ) {
      this.lastPopTime = now;
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

  // Satu letupan knalpot: ledakan noise + dentuman rendah
  private pop(at: number, level: number, pitch: number) {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const burst = this.ctx.createBufferSource();
    burst.buffer = this.noiseBuffer;
    const bf = this.ctx.createBiquadFilter();
    bf.type = 'lowpass';
    bf.frequency.setValueAtTime(pitch * 14, at);
    bf.frequency.exponentialRampToValueAtTime(pitch * 2.5, at + 0.08);
    const bg = this.ctx.createGain();
    bg.gain.setValueAtTime(level, at);
    bg.gain.exponentialRampToValueAtTime(0.001, at + 0.09);
    burst.connect(bf);
    bf.connect(bg);
    bg.connect(this.masterGain);
    burst.start(at, Math.random() * 1.5, 0.1);

    const thump = this.ctx.createOscillator();
    const tg = this.ctx.createGain();
    thump.type = 'sawtooth';
    thump.frequency.setValueAtTime(pitch * 1.6, at);
    thump.frequency.exponentialRampToValueAtTime(Math.max(28, pitch * 0.45), at + 0.09);
    tg.gain.setValueAtTime(level * 0.9, at);
    tg.gain.exponentialRampToValueAtTime(0.001, at + 0.1);
    thump.connect(tg);
    tg.connect(this.masterGain);
    thump.start(at);
    thump.stop(at + 0.11);
  }

  // Backfire / burble: V8 memberi rentetan letupan dalam, mesin lain 1-2 letupan
  public playBackfire() {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const v = VOICES[this.voiceId ?? 'i4_sport'];
    const count = Math.max(1, v.pops);
    const now = this.ctx.currentTime;
    let t = now;
    for (let i = 0; i < count; i++) {
      const level = 0.2 * Math.pow(0.72, i) * (0.85 + Math.random() * 0.3);
      this.pop(t, level, v.popPitch);
      t += 0.05 + Math.random() * 0.06;
    }
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
