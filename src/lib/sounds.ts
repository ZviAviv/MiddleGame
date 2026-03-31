"use client";

type SoundName = "pop" | "whoosh" | "join" | "party" | "nudge";

class SoundManager {
  private ctx: AudioContext | null = null;
  private _muted: boolean = false;

  constructor() {
    if (typeof window !== "undefined") {
      this._muted = localStorage.getItem("middlegame_muted") === "true";
      // Pre-warm AudioContext on first user interaction so sounds play instantly later
      const warmUp = () => {
        this.getCtx().resume();
        document.removeEventListener("pointerdown", warmUp);
        document.removeEventListener("keydown", warmUp);
      };
      document.addEventListener("pointerdown", warmUp, { once: true });
      document.addEventListener("keydown", warmUp, { once: true });
    }
  }

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  get isMuted() {
    return this._muted;
  }

  toggleMute(): boolean {
    this._muted = !this._muted;
    if (typeof window !== "undefined") {
      localStorage.setItem("middlegame_muted", String(this._muted));
    }
    return this._muted;
  }

  play(name: SoundName) {
    if (this._muted || typeof window === "undefined") return;

    try {
      const ctx = this.getCtx();
      if (ctx.state === "suspended") ctx.resume();

      switch (name) {
        case "pop":
          this.playPop(ctx);
          break;
        case "whoosh":
          this.playWhoosh(ctx);
          break;
        case "join":
          this.playJoin(ctx);
          break;
        case "party":
          this.playParty(ctx);
          break;
        case "nudge":
          this.playNudge(ctx);
          break;
      }
    } catch {
      // Ignore audio errors
    }
  }

  private playTone(ctx: AudioContext, freq: number, duration: number, delay: number = 0, type: OscillatorType = "sine") {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = freq;
    const startTime = ctx.currentTime + delay;
    gain.gain.setValueAtTime(0.15, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  private playPop(ctx: AudioContext) {
    // Quick rising pop sound
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  }

  private playWhoosh(ctx: AudioContext) {
    // Swoosh sound using filtered noise approximation
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  }

  private playJoin(ctx: AudioContext) {
    // Friendly two-note ding
    this.playTone(ctx, 523, 0.15, 0);      // C5
    this.playTone(ctx, 659, 0.2, 0.08);    // E5
  }

  private playNudge(ctx: AudioContext) {
    // Gentle two-tap alert — distinct from "join" and "pop"
    this.playTone(ctx, 880, 0.12, 0);       // A5
    this.playTone(ctx, 880, 0.12, 0.15);    // A5 again
  }

  private playParty(ctx: AudioContext) {
    // Celebratory ascending sequence
    const notes = [523, 587, 659, 784, 880, 1047]; // C5 to C6
    notes.forEach((freq, i) => {
      this.playTone(ctx, freq, 0.2, i * 0.1);
    });
    // Extra sparkle
    setTimeout(() => {
      this.playTone(ctx, 1319, 0.3, 0);    // E6
      this.playTone(ctx, 1568, 0.4, 0.1);  // G6
    }, 700);
  }
}

export const soundManager = typeof window !== "undefined" ? new SoundManager() : null;
