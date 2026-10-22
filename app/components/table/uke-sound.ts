import * as Tone from 'tone';
import { CHORDS, PATTERN, SONG, STRINGS, type ChordName } from './uke-song';

/*
 * The ukulele's voice: four plucked strings (Karplus–Strong, through Tone.js) tuned G C E A,
 * re-entrant like a real soprano, into a little body resonance and a small room. This module is
 * loaded on demand, the first time the ukulele comes into view.
 */

type Listener = {
  /** A string sounds (for its vibration), at audio time `time`. */
  onPluck?: (string: number, velocity: number) => void;
  /** A strum starts, in direction dir. */
  onStrum?: (dir: 1 | -1) => void;
  /** Autoplay moved to bar/step (step −1 when it ends). */
  onStep?: (bar: number, step: number, chord: ChordName) => void;
  onEnd?: () => void;
};

const note = (string: number, fret: number) => Tone.Frequency(STRINGS[string]).transpose(fret).toFrequency();

/** Use an AudioContext made (and unlocked) inside the tap that picked the ukulele up. */
export function adoptContext(ctx: AudioContext) {
  Tone.setContext(ctx);
}

export class UkeSound {
  private strings: Tone.PluckSynth[];
  private gains: Tone.Gain[];
  private out: Tone.Volume;
  private nodes: Tone.ToneAudioNode[] = [];
  private playing = false;
  listener: Listener = {};

  constructor() {
    this.out = new Tone.Volume(-4).toDestination();
    const room = new Tone.Reverb({ decay: 1.6, preDelay: 0.01, wet: 0.14 });
    // a small box of wood: some warmth round 250 Hz, the fizz taken off the top
    const body = new Tone.Filter({ type: 'peaking', frequency: 250, Q: 1.1, gain: 5 });
    const top = new Tone.Filter({ type: 'lowpass', frequency: 5600, rolloff: -12 });
    const glue = new Tone.Compressor({ threshold: -18, ratio: 3, attack: 0.004, release: 0.12 });
    body.chain(top, glue, room, this.out);
    this.gains = STRINGS.map(() => new Tone.Gain(0.8).connect(body));
    this.strings = STRINGS.map(
      (_, i) =>
        new Tone.PluckSynth({ attackNoise: 1.1, dampening: 3600 + i * 250, resonance: 0.965, release: 1.4 }).connect(this.gains[i]),
    );
    this.nodes.push(room, body, top, glue);
  }

  /** Must be called from a click or a key press, so the browser lets the page make sound. */
  async wake() {
    await Tone.start();
  }

  /** Seconds from now, on the audio clock. */
  soon(delay = 0) {
    return Tone.now() + delay;
  }

  pluck(string: number, fret: number, velocity = 0.8, time = Tone.now()) {
    this.gains[string].gain.setValueAtTime(0.12 + velocity * 0.88, time);
    this.strings[string].triggerAttack(note(string, fret), time);
    Tone.getDraw().schedule(() => this.listener.onPluck?.(string, velocity), time);
  }

  /** A strum across all four strings (or three, on a light upstroke), staggered like a real one. */
  strum(chord: ChordName, dir: 1 | -1, velocity = 0.8, time = Tone.now() + 0.01) {
    const frets = CHORDS[chord];
    const order = dir > 0 ? [0, 1, 2, 3] : [3, 2, 1, 0];
    // a thumb brushing across, not a machine: the softer the strum, the slower it rolls
    const gap = (dir > 0 ? 0.02 : 0.015) * (1.25 - velocity * 0.5);
    const light = dir < 0 && velocity < 0.6;
    Tone.getDraw().schedule(() => this.listener.onStrum?.(dir), time);
    order.forEach((s, i) => {
      if (light && s === 0) return;
      this.pluck(s, frets[s], velocity * (1 - i * 0.05), time + i * gap);
    });
  }

  /** Play the song through once. */
  play() {
    this.stop();
    const transport = Tone.getTransport();
    transport.bpm.value = SONG.bpm;
    const sixteenth = 60 / SONG.bpm / 4;
    const start = 0.15;
    let t = start;
    SONG.bars.forEach((chord, bar) => {
      PATTERN.forEach((s, step) => {
        const at = t + step * sixteenth;
        // a little swing on the off-sixteenths
        const swing = step % 2 ? sixteenth * 0.12 : 0;
        transport.schedule(time => {
          Tone.getDraw().schedule(() => this.listener.onStep?.(bar, step, chord), time);
          if (!s) return;
          // the accents carry it; everything in between is a light brush, a person and not a sequencer
          const v = (s.accent ? 0.92 : s.dir > 0 ? 0.5 : 0.36) + (Math.random() - 0.5) * 0.08;
          this.strum(chord, s.dir, v, time + (Math.random() - 0.5) * 0.01);
        }, at + swing);
      });
      t += 16 * sixteenth;
    });
    // and one to let ring
    transport.schedule(time => {
      Tone.getDraw().schedule(() => this.listener.onStep?.(SONG.bars.length, 0, SONG.end), time);
      this.strum(SONG.end, 1, 0.85, time);
    }, t);
    transport.schedule(time => Tone.getDraw().schedule(() => this.finish(), time), t + 3);
    transport.position = 0;
    transport.start('+0.05');
    this.playing = true;
  }

  private finish() {
    if (!this.playing) return;
    this.playing = false;
    const transport = Tone.getTransport();
    transport.stop();
    transport.cancel();
    this.listener.onEnd?.();
  }

  get isPlaying() {
    return this.playing;
  }

  /** Stop the song, and damp the strings with the palm. */
  stop(hush = false) {
    const transport = Tone.getTransport();
    transport.stop();
    transport.cancel();
    if (this.playing) {
      this.playing = false;
      this.listener.onEnd?.();
    }
    if (hush) {
      const now = Tone.now();
      for (const g of this.gains) {
        g.gain.cancelScheduledValues(now);
        g.gain.setValueAtTime(g.gain.value, now);
        g.gain.linearRampToValueAtTime(0, now + 0.08);
      }
    }
  }

  dispose() {
    this.stop(true);
    for (const s of this.strings) s.dispose();
    for (const g of this.gains) g.dispose();
    for (const n of this.nodes) n.dispose();
    this.out.dispose();
  }
}
