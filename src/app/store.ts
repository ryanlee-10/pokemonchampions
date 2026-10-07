import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Settings {
  masterVolume: number; // 0-100
  musicVolume: number;
  sfxVolume: number;
  muteWhenBlurred: boolean;
  animationSpeed: 'Slow' | 'Normal' | 'Fast';
  particleQuality: 'Low' | 'Medium' | 'High';
  reducedMotion: boolean;
  screenShake: boolean;
  textSpeed: 'Slow' | 'Normal' | 'Fast';
  autoSkipAnimations: boolean;
  cpuTimer: boolean;
  showDamagePercent: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  masterVolume: 80,
  musicVolume: 70,
  sfxVolume: 80,
  muteWhenBlurred: true,
  animationSpeed: 'Normal',
  particleQuality: 'High',
  reducedMotion: false,
  screenShake: true,
  textSpeed: 'Normal',
  autoSkipAnimations: false,
  cpuTimer: true,
  showDamagePercent: true,
};

export const SETTING_PRESETS: Record<string, Settings> = {
  Default: DEFAULT_SETTINGS,
  Performance: {
    ...DEFAULT_SETTINGS,
    particleQuality: 'Low',
    screenShake: false,
    animationSpeed: 'Fast',
    autoSkipAnimations: true,
  },
  Cinematic: {
    ...DEFAULT_SETTINGS,
    animationSpeed: 'Slow',
    particleQuality: 'High',
    textSpeed: 'Slow',
  },
};

export interface MatchRecord {
  id: string;
  result: 'Win' | 'Loss';
  mode: 'CPU' | 'Multiplayer';
  format: 'Singles' | 'Doubles';
  turns: number;
  date: number;
}

interface ProfileState {
  name: string;
  avatar: string;
  wins: number;
  losses: number;
  history: MatchRecord[];
  usage: Record<string, number>;
}

export type Screen =
  | 'MAIN_MENU'
  | 'MULTIPLAYER'
  | 'CPU'
  | 'TEAMBUILDER'
  | 'PROFILE'
  | 'BATTLE';

interface AppStore {
  settings: Settings;
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  loadPreset: (name: string) => void;

  profile: ProfileState;
  setProfileName: (name: string) => void;
  setAvatar: (a: string) => void;
  recordMatch: (rec: Omit<MatchRecord, 'id' | 'date'>, usedSpecies: string[]) => void;

  // transient UI state (not persisted)
  introDone: boolean;
  setIntroDone: (v: boolean) => void;
  settingsOpen: boolean;
  setSettingsOpen: (v: boolean) => void;
  musicOpen: boolean;
  setMusicOpen: (v: boolean) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      setSetting: (key, value) =>
        set((s) => ({ settings: { ...s.settings, [key]: value } })),
      loadPreset: (name) =>
        set({ settings: { ...(SETTING_PRESETS[name] ?? DEFAULT_SETTINGS) } }),

      profile: { name: 'Trainer', avatar: '⚡', wins: 0, losses: 0, history: [], usage: {} },
      setProfileName: (name) => set((s) => ({ profile: { ...s.profile, name } })),
      setAvatar: (avatar) => set((s) => ({ profile: { ...s.profile, avatar } })),
      recordMatch: (rec, usedSpecies) =>
        set((s) => {
          const usage = { ...s.profile.usage };
          usedSpecies.forEach((id) => (usage[id] = (usage[id] || 0) + 1));
          return {
            profile: {
              ...s.profile,
              wins: s.profile.wins + (rec.result === 'Win' ? 1 : 0),
              losses: s.profile.losses + (rec.result === 'Loss' ? 1 : 0),
              usage,
              history: [
                { ...rec, id: Math.random().toString(36).slice(2), date: Date.now() },
                ...s.profile.history,
              ].slice(0, 30),
            },
          };
        }),

      introDone: false,
      setIntroDone: (introDone) => set({ introDone }),
      settingsOpen: false,
      setSettingsOpen: (settingsOpen) => set({ settingsOpen, musicOpen: false }),
      musicOpen: false,
      setMusicOpen: (musicOpen) => set({ musicOpen }),
    }),
    {
      name: 'zenith-save',
      partialize: (s) => ({ settings: s.settings, profile: s.profile }),
    }
  )
);

export const animSpeedFactor = (s: Settings) =>
  s.reducedMotion ? 0.01 : s.animationSpeed === 'Slow' ? 1.6 : s.animationSpeed === 'Fast' ? 0.6 : 1;
