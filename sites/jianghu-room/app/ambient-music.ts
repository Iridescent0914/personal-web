// Original instrumental loop in a D major pentatonic palette. The short plucked
// phrases, low pulse, and flute-like accents aim for a lively jianghu mood.
const melody = [
  587.33, 0, 659.25, 739.99, 880.0, 739.99, 659.25, 587.33,
  493.88, 587.33, 659.25, 0, 587.33, 493.88, 440.0, 0,
  440.0, 493.88, 587.33, 659.25, 739.99, 659.25, 587.33, 493.88,
  440.0, 493.88, 587.33, 493.88, 440.0, 369.99, 440.0, 0,
];
const bass = [146.83, 123.47, 98.0, 110.0];
const accompaniment = [
  [293.66, 440.0, 369.99, 440.0],
  [246.94, 369.99, 329.63, 369.99],
  [196.0, 293.66, 246.94, 293.66],
  [220.0, 329.63, 277.18, 329.63],
];

export class AmbientMusic {
  private context: AudioContext | null = null;
  private timer: number | null = null;
  private step = 0;
  private desired = false;

  async start() {
    this.desired = true;
    if (!this.context) this.context = new AudioContext();
    await this.context.resume();
    if (!this.desired || this.timer !== null) return;
    this.tick();
    this.timer = window.setInterval(() => this.tick(), 300);
  }

  stop() {
    this.desired = false;
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    if (this.context?.state === "running") void this.context.suspend().catch(() => {});
  }

  async setHidden(hidden: boolean) {
    if (!this.context || !this.desired) return;
    try {
      if (hidden && this.context.state === "running") await this.context.suspend();
      else if (!hidden && this.context.state === "suspended") await this.context.resume();
    } catch {
      // The page may be closing while a visibility change is in flight.
    }
  }

  dispose() {
    this.stop();
    if (this.context && this.context.state !== "closed") void this.context.close().catch(() => {});
    this.context = null;
  }

  private tick() {
    if (!this.context || this.context.state !== "running") return;
    const note = melody[this.step];
    if (note) this.pluck(note, 0.46, 0.039);
    if (this.step % 2 === 0) {
      const bar = Math.floor(this.step / 8);
      const arpeggio = accompaniment[bar][(this.step / 2) % 4];
      this.pluck(arpeggio, 0.35, 0.011);
    }
    if (this.step % 8 === 0) this.pluck(bass[this.step / 8], 1.3, 0.017);
    if (this.step === 7 || this.step === 23) this.flute(note || 587.33, 0.72);
    this.step = (this.step + 1) % melody.length;
  }

  private pluck(frequency: number, duration: number, volume: number) {
    const context = this.context;
    if (!context) return;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const overtone = context.createOscillator();
    const gain = context.createGain();
    const overtoneGain = context.createGain();
    oscillator.type = "triangle";
    overtone.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, now);
    overtone.frequency.setValueAtTime(frequency * 2, now);
    overtoneGain.gain.value = 0.18;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    overtone.connect(overtoneGain);
    overtoneGain.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    overtone.start(now);
    oscillator.stop(now + duration + 0.02);
    overtone.stop(now + duration + 0.02);
    oscillator.onended = () => { oscillator.disconnect(); overtone.disconnect(); overtoneGain.disconnect(); gain.disconnect(); };
  }

  private flute(frequency: number, duration: number) {
    const context = this.context;
    if (!context) return;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency / 2, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.012, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
}
