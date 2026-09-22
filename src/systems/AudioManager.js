// PRD §10 — every sound is generated with Web Audio. No external files.

import { SaveManager } from './SaveManager.js';

class Audio {
  constructor() {
    this.ctx = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.musicTimer = null;
    this.musicStep = 0;
    this.musicTheme = null;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    this.ctx = new AC();
    this.sfxGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();
    this.sfxGain.connect(this.ctx.destination);
    this.musicGain.connect(this.ctx.destination);
    this.applyVolumes();
    return this.ctx;
  }

  applyVolumes() {
    if (!this.ctx) return;
    const s = SaveManager.settings;
    this.sfxGain.gain.value = s.volumeSfx;
    this.musicGain.gain.value = s.volumeMusic * 0.45;
  }

  /** One shaped oscillator note. */
  tone(opts) {
    const ctx = this.ensure();
    if (!ctx) return;
    const freq = opts.freq != null ? opts.freq : 440;
    const to = opts.to != null ? opts.to : null;
    const type = opts.type || 'square';
    const dur = opts.dur != null ? opts.dur : 0.12;
    const vol = opts.vol != null ? opts.vol : 0.25;
    const delay = opts.delay || 0;
    const bus = opts.bus || 'sfx';
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to != null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(bus === 'music' ? this.musicGain : this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /** Filtered noise burst — impacts, dust, water, rumble. */
  noise(opts) {
    const ctx = this.ensure();
    if (!ctx) return;
    const dur = opts.dur != null ? opts.dur : 0.2;
    const vol = opts.vol != null ? opts.vol : 0.2;
    const delay = opts.delay || 0;
    const filter = opts.filter || 'lowpass';
    const freq = opts.freq != null ? opts.freq : 1200;
    const sweepTo = opts.sweepTo != null ? opts.sweepTo : null;
    const q = opts.q != null ? opts.q : 1;
    const t0 = ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bq = ctx.createBiquadFilter();
    bq.type = filter;
    bq.frequency.setValueAtTime(freq, t0);
    bq.Q.value = q;
    if (sweepTo != null) bq.frequency.exponentialRampToValueAtTime(Math.max(40, sweepTo), t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(bq);
    bq.connect(g);
    g.connect(this.sfxGain);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  // ---- gameplay cues -------------------------------------------------
  jump() { this.tone({ freq: 280, to: 620, type: 'square', dur: 0.13, vol: 0.18 }); }
  land() { this.noise({ dur: 0.09, vol: 0.14, freq: 700, sweepTo: 180 }); }

  gem(tier) {
    const base = tier === 'three' ? 1046 : tier === 'two' ? 784 : 659;
    this.tone({ freq: base, type: 'triangle', dur: 0.10, vol: 0.22 });
    this.tone({ freq: base * 1.5, type: 'triangle', dur: 0.13, vol: 0.14, delay: 0.045 });
  }

  fire() { this.tone({ freq: 760, to: 240, type: 'sawtooth', dur: 0.09, vol: 0.14 }); }
  emptyClick() { this.tone({ freq: 190, to: 150, type: 'square', dur: 0.05, vol: 0.07 }); }
  enemyHit() { this.noise({ dur: 0.07, vol: 0.18, freq: 2600, sweepTo: 900, filter: 'bandpass', q: 2 }); }

  enemyDeath() {
    this.noise({ dur: 0.22, vol: 0.20, freq: 1800, sweepTo: 160 });
    this.tone({ freq: 300, to: 90, type: 'square', dur: 0.18, vol: 0.12 });
  }

  playerDeath() {
    this.tone({ freq: 440, to: 70, type: 'sawtooth', dur: 0.55, vol: 0.22 });
    this.noise({ dur: 0.5, vol: 0.16, freq: 900, sweepTo: 90 });
  }

  extraLife() {
    const notes = [523, 659, 784, 1046];
    for (let i = 0; i < notes.length; i++) {
      this.tone({ freq: notes[i], type: 'triangle', dur: 0.16, vol: 0.2, delay: i * 0.07 });
    }
  }

  checkpoint() {
    const notes = [392, 587, 784];
    for (let i = 0; i < notes.length; i++) {
      this.tone({ freq: notes[i], type: 'sine', dur: 0.3, vol: 0.18, delay: i * 0.08 });
    }
  }

  gate() {
    const notes = [330, 440, 554, 660];
    for (let i = 0; i < notes.length; i++) {
      this.tone({ freq: notes[i], type: 'sine', dur: 0.5, vol: 0.16, delay: i * 0.09 });
    }
  }

  levelComplete() {
    const notes = [523, 587, 659, 784, 1046];
    for (let i = 0; i < notes.length; i++) {
      this.tone({ freq: notes[i], type: 'triangle', dur: 0.26, vol: 0.2, delay: i * 0.12 });
    }
  }

  gameOver() {
    const notes = [440, 392, 330, 247];
    for (let i = 0; i < notes.length; i++) {
      this.tone({ freq: notes[i], type: 'square', dur: 0.4, vol: 0.18, delay: i * 0.18 });
    }
  }

  menuMove() { this.tone({ freq: 620, type: 'square', dur: 0.04, vol: 0.10 }); }
  menuPick() { this.tone({ freq: 480, to: 880, type: 'square', dur: 0.10, vol: 0.14 }); }

  // ---- hazard tells (PRD §8) ----------------------------------------
  rockWarn() { this.noise({ dur: 0.6, vol: 0.10, freq: 3200, sweepTo: 1200, filter: 'highpass' }); }
  rockShatter() { this.noise({ dur: 0.3, vol: 0.22, freq: 1600, sweepTo: 120 }); }
  crumbleWarn() { this.noise({ dur: 0.7, vol: 0.09, freq: 900, sweepTo: 300, filter: 'bandpass', q: 3 }); }
  tideWarn() { this.noise({ dur: 0.9, vol: 0.12, freq: 340, sweepTo: 900, filter: 'bandpass', q: 1.5 }); }
  bubble() { this.tone({ freq: 220, to: 520, type: 'sine', dur: 0.2, vol: 0.10 }); }
  pillarWarn() { this.tone({ freq: 90, to: 200, type: 'sawtooth', dur: 0.55, vol: 0.10 }); }
  pillarErupt() { this.noise({ dur: 0.7, vol: 0.20, freq: 600, sweepTo: 2200, filter: 'bandpass', q: 0.8 }); }
  spitterGlow() { this.tone({ freq: 160, to: 320, type: 'sawtooth', dur: 0.5, vol: 0.08 }); }
  spitterShot() { this.tone({ freq: 420, to: 180, type: 'sawtooth', dur: 0.2, vol: 0.14 }); }

  lavaRumble() {
    this.tone({ freq: 55, to: 40, type: 'sawtooth', dur: 2.6, vol: 0.16 });
    this.noise({ dur: 2.6, vol: 0.12, freq: 220, sweepTo: 60 });
  }

  // ---- music: one short procedural loop per level ---------------------
  startMusic(theme) {
    this.stopMusic();
    const ctx = this.ensure();
    if (!ctx) return;
    this.musicTheme = theme;
    this.musicStep = 0;
    const plans = {
      trial: { bpm: 96, scale: [0, 3, 5, 7, 10], root: 196, density: 0.35, type: 'triangle' },
      earth: { bpm: 108, scale: [0, 2, 3, 7, 8], root: 174, density: 0.45, type: 'triangle' },
      water: { bpm: 116, scale: [0, 2, 5, 7, 9], root: 208, density: 0.50, type: 'sine' },
      air: { bpm: 128, scale: [0, 2, 4, 7, 11], root: 233, density: 0.60, type: 'triangle' },
      fire: { bpm: 142, scale: [0, 1, 5, 6, 10], root: 165, density: 0.70, type: 'sawtooth' },
    };
    const p = plans[theme] || plans.trial;
    const stepMs = 60000 / p.bpm / 2;
    this.musicTimer = setInterval(() => {
      const s = this.musicStep++;
      if (s % 4 === 0) {
        this.tone({ freq: p.root / 2, type: 'sine', dur: 0.22, vol: 0.30, bus: 'music' });
      }
      if (Math.random() < p.density) {
        const note = p.scale[(s * 3 + (s >> 2)) % p.scale.length];
        const oct = (s % 8 < 4) ? 1 : 2;
        this.tone({
          freq: p.root * oct * Math.pow(2, note / 12),
          type: p.type, dur: 0.16, vol: 0.14, bus: 'music',
        });
      }
    }, stepMs);
  }

  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

export const AudioManager = new Audio();
