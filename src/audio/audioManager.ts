import { useSyncExternalStore } from 'react';

export interface Track {
  file: string;
  title: string;
}

interface Playlist {
  intro?: { file: string; dropAt?: number; title?: string };
  tracks: Track[];
}

export interface AudioSnapshot {
  tracks: Track[];
  current: Track | null;
  playing: boolean;
  hasAudio: boolean;
}

/**
 * Single audio engine: <audio> element -> MediaElementSource -> Analyser -> Gain -> out.
 * No-repeat shuffle: never plays the same track twice in a row.
 */
class AudioManager {
  private el: HTMLAudioElement | null = null;
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gain: GainNode | null = null;
  private freq: Uint8Array<ArrayBuffer> = new Uint8Array(new ArrayBuffer(64));
  private listeners = new Set<() => void>();
  private playlist: Playlist = { tracks: [] };
  private loaded = false;
  private master = 0.8;
  private music = 0.7;
  private introMode = false;
  public introDropAt = 6500;
  private snapshot: AudioSnapshot = { tracks: [], current: null, playing: false, hasAudio: false };

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getSnapshot = () => this.snapshot;
  private emit(patch: Partial<AudioSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((l) => l());
  }

  async load() {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const res = await fetch('/audio/playlist.json');
      if (res.ok) this.playlist = await res.json();
    } catch {
      /* no playlist: run silently */
    }
    if (this.playlist.intro?.dropAt) this.introDropAt = this.playlist.intro.dropAt;
    const hasAudio = !!this.playlist.intro || this.playlist.tracks.length > 0;
    this.emit({ tracks: this.playlist.tracks, hasAudio });
  }

  private ensureGraph() {
    if (this.ctx) return;
    this.el = new Audio();
    this.el.crossOrigin = 'anonymous';
    this.el.addEventListener('ended', () => this.onEnded());
    this.el.addEventListener('play', () => this.emit({ playing: true }));
    this.el.addEventListener('pause', () => this.emit({ playing: false }));
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AC();
    const src = this.ctx.createMediaElementSource(this.el);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 128;
    this.analyser.smoothingTimeConstant = 0.82;
    this.gain = this.ctx.createGain();
    src.connect(this.analyser);
    this.analyser.connect(this.gain);
    this.gain.connect(this.ctx.destination);
    this.freq = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));
    this.applyVolume();
  }

  private applyVolume() {
    if (this.gain) this.gain.gain.value = this.master * this.music;
  }

  setVolumes(master: number, music: number) {
    this.master = master / 100;
    this.music = music / 100;
    this.applyVolume();
  }

  /** Must be called from a user gesture. Returns true if an intro track is playing. */
  async startIntro(): Promise<boolean> {
    await this.load();
    this.ensureGraph();
    await this.ctx?.resume();
    const intro = this.playlist.intro;
    if (!intro) return false;
    this.introMode = true;
    return this.playFile({ file: intro.file, title: intro.title ?? 'Pokémon Zenith Theme' });
  }

  private async playFile(track: Track): Promise<boolean> {
    if (!this.el) return false;
    this.el.src = track.file;
    this.emit({ current: track });
    try {
      await this.el.play();
      return true;
    } catch {
      return false;
    }
  }

  private pickNext(): Track | null {
    const pool = this.playlist.tracks;
    if (!pool.length) return null;
    const cur = this.snapshot.current;
    const candidates = pool.length > 1 ? pool.filter((t) => t.file !== cur?.file) : pool;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  private onEnded() {
    this.introMode = false;
    this.next();
  }

  next() {
    const t = this.pickNext();
    if (t) this.playFile(t);
  }

  playTrack(t: Track) {
    this.introMode = false;
    this.ensureGraph();
    this.ctx?.resume();
    this.playFile(t);
  }

  toggle() {
    if (!this.el) return;
    if (this.el.paused) {
      if (!this.el.src) this.next();
      else this.el.play();
    } else this.el.pause();
  }

  isIntroMode() {
    return this.introMode;
  }

  /** 0..1 energy bands for visualizer; zeros when silent. */
  getBands(count: number): number[] {
    const out = new Array(count).fill(0);
    if (!this.analyser || !this.snapshot.playing) return out;
    this.analyser.getByteFrequencyData(this.freq);
    const usable = Math.floor(this.freq.length * 0.75);
    for (let i = 0; i < count; i++) {
      const a = Math.floor((i / count) * usable);
      const b = Math.max(a + 1, Math.floor(((i + 1) / count) * usable));
      let sum = 0;
      for (let j = a; j < b; j++) sum += this.freq[j];
      out[i] = sum / (b - a) / 255;
    }
    return out;
  }
}

export const audioManager = new AudioManager();

export function useAudio(): AudioSnapshot {
  return useSyncExternalStore(audioManager.subscribe, audioManager.getSnapshot);
}
