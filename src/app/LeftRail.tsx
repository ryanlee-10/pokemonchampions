import React from 'react';
import { motion } from 'motion/react';
import { useAppStore } from './store';
import type { Screen } from './store';
import {
  HomeIcon, MusicIcon, MultiplayerIcon, CpuBattleIcon,
  TeambuilderIcon, ProfileIcon, SettingsIcon,
} from './icons';

interface RailItem {
  id: string;
  label: string;
  icon: React.FC<{ size?: number; className?: string }>;
  screen?: Screen;
}

const TOP: RailItem[] = [
  { id: 'home', label: 'Home', icon: HomeIcon, screen: 'MAIN_MENU' },
  { id: 'music', label: 'Music', icon: MusicIcon },
  { id: 'mp', label: 'Multiplayer Battle', icon: MultiplayerIcon, screen: 'MULTIPLAYER' },
  { id: 'cpu', label: 'CPU Battle', icon: CpuBattleIcon, screen: 'CPU' },
  { id: 'tb', label: 'Teambuilder', icon: TeambuilderIcon, screen: 'TEAMBUILDER' },
];

interface Props {
  screen: Screen;
  onNavigate: (s: Screen) => void;
}

export const LeftRail: React.FC<Props> = ({ screen, onNavigate }) => {
  const musicOpen = useAppStore((s) => s.musicOpen);
  const setMusicOpen = useAppStore((s) => s.setMusicOpen);
  const settingsOpen = useAppStore((s) => s.settingsOpen);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);

  const renderBtn = (item: RailItem, active: boolean, onClick: () => void) => (
    <button
      key={item.id}
      id={`rail-${item.id}`}
      className={`rail-btn ${active ? 'active' : ''}`}
      onClick={onClick}
      aria-label={item.label}
    >
      {active && <motion.span layoutId="rail-pill" className="rail-pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
      <item.icon size={22} className="rail-icon" />
      <span className="rail-tip">{item.label}</span>
    </button>
  );

  return (
    <aside className="left-rail">
      <nav className="rail-group">
        {TOP.map((item) =>
          item.id === 'music'
            ? renderBtn(item, musicOpen, () => { setSettingsOpen(false); setMusicOpen(!musicOpen); })
            : renderBtn(item, item.screen === screen && !musicOpen && !settingsOpen, () => {
                setMusicOpen(false);
                setSettingsOpen(false);
                onNavigate(item.screen!);
              })
        )}
      </nav>
      <div className="rail-group rail-bottom">
        {renderBtn(
          { id: 'profile', label: 'Profile', icon: ProfileIcon, screen: 'PROFILE' },
          screen === 'PROFILE' && !settingsOpen,
          () => { setMusicOpen(false); setSettingsOpen(false); onNavigate('PROFILE'); }
        )}
        {renderBtn(
          { id: 'settings', label: 'Settings', icon: SettingsIcon },
          settingsOpen,
          () => setSettingsOpen(!settingsOpen)
        )}
      </div>
    </aside>
  );
};
