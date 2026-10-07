import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { BattleFormat, CustomPokemon, PlayerTeam } from './types/pokemon';
import { POKEMON_ROSTER } from './data/pokemonRoster';
import { MainMenu } from './components/MainMenu';
import { Lobby } from './components/Lobby';
import { BattleScreen } from './components/BattleScreen';
import { LeftRail } from './app/LeftRail';
import { MusicPopover } from './app/MusicPopover';
import { SettingsPanel } from './app/SettingsPanel';
import { useAppStore } from './app/store';
import type { Screen } from './app/store';
import { audioManager } from './audio/audioManager';
import { IntroSequence } from './intro/IntroSequence';
import { PreMenu } from './intro/PreMenu';
import { CpuSetup } from './screens/CpuSetup';
import { ProfileScreen } from './screens/ProfileScreen';
import { TeambuilderHub } from './screens/TeambuilderHub';
import type { TeambuilderTab } from './screens/TeambuilderHub';
import './styles/zenith.css';

function createStarterPokemon(speciesId: string): CustomPokemon {
  const spec = POKEMON_ROSTER.find((s) => s.id === speciesId) || POKEMON_ROSTER[0];
  return {
    id: `pkmn_init_${spec.id}_${Math.random().toString(36).substring(2, 7)}`,
    speciesId: spec.id,
    nickname: spec.name,
    level: 50,
    item: spec.megaForm ? (Array.isArray(spec.megaForm) ? spec.megaForm[0].megaStoneId : spec.megaForm.megaStoneId) : 'none',
    ability: spec.abilities[0] || 'Overgrow',
    nature: 'Adamant',
    evs: { hp: 32, attack: 32, defense: 2, spAtk: 0, spDef: 0, speed: 0 },
    moves: spec.learnset.slice(0, 4),
  };
}

type Phase = 'INTRO' | 'PREMENU' | 'APP';

export function App() {
  const [phase, setPhase] = useState<Phase>('INTRO');
  const [screen, setScreen] = useState<Screen>('MAIN_MENU');
  const [tbTab, setTbTab] = useState<TeambuilderTab>('Boxes');
  const [format, setFormat] = useState<BattleFormat>('Doubles');
  const settings = useAppStore((s) => s.settings);

  const [teams, setTeams] = useState<PlayerTeam[]>(() => {
    const saved = localStorage.getItem('zenith_teams');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error('Failed to parse saved teams'); }
    }
    return [
      {
        playerId: 'player',
        name: 'Alpha Squad',
        pokemon: ['pawmot', 'absol', 'politoed', 'excadrill', 'volcarona', 'maushold'].map(createStarterPokemon),
      },
    ];
  });
  const [activeTeamIdx, setActiveTeamIdx] = useState(0);
  const [pcBox, setPcBox] = useState<CustomPokemon[]>(() => {
    const saved = localStorage.getItem('zenith_pcbox');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error('Failed to parse saved PC Box'); }
    }
    return POKEMON_ROSTER.map((p) => createStarterPokemon(p.id));
  });
  const [isHost, setIsHost] = useState(true);
  const [roomId, setRoomId] = useState('LOCAL_SOLO');

  const activeTeam = teams[activeTeamIdx]?.pokemon || [];

  // Persist state to localStorage
  useEffect(() => {
    localStorage.setItem('zenith_teams', JSON.stringify(teams));
  }, [teams]);

  useEffect(() => {
    localStorage.setItem('zenith_pcbox', JSON.stringify(pcBox));
  }, [pcBox]);

  // Audio volume sync + mute when unfocused
  useEffect(() => {
    audioManager.setVolumes(settings.masterVolume, settings.musicVolume);
  }, [settings.masterVolume, settings.musicVolume]);

  useEffect(() => {
    if (!settings.muteWhenBlurred) return;
    const onVis = () =>
      audioManager.setVolumes(document.hidden ? 0 : settings.masterVolume, settings.musicVolume);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [settings.muteWhenBlurred, settings.masterVolume, settings.musicVolume]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', settings.reducedMotion);
  }, [settings.reducedMotion]);

  const handleUpdateActiveTeam = (newTeamPkmn: CustomPokemon[]) =>
    setTeams((prev) => prev.map((t, idx) => (idx === activeTeamIdx ? { ...t, pokemon: newTeamPkmn } : t)));

  const handleUpdatePokemonInRoster = (updated: CustomPokemon) => {
    handleUpdateActiveTeam(activeTeam.map((p) => (p.id === updated.id ? updated : p)));
    if (pcBox.some((p) => p.id === updated.id)) setPcBox(pcBox.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleStartGame = (hostFlag: boolean, roomCode: string) => {
    setIsHost(hostFlag);
    setRoomId(roomCode);
    setScreen('BATTLE');
  };

  const openTeambuilder = (tab: TeambuilderTab) => {
    setTbTab(tab);
    setScreen('TEAMBUILDER');
  };

  if (phase === 'INTRO') {
    return <IntroSequence onFinish={() => { useAppStore.getState().setIntroDone(true); setPhase('PREMENU'); }} />;
  }

  return (
    <div className="zenith-app">
      <AnimatePresence mode="wait">
        {phase === 'PREMENU' && <PreMenu key="pre" onEnter={() => setPhase('APP')} />}
      </AnimatePresence>

      {phase === 'APP' && (
        <>
          <LeftRail screen={screen} onNavigate={setScreen} />
          <main className={`zenith-main ${screen === 'BATTLE' ? 'is-battle' : ''}`}>
            <AnimatePresence mode="wait">
              <motion.div
                key={screen === 'TEAMBUILDER' ? `tb-${tbTab}` : screen}
                className="screen-wrap"
                initial={{ opacity: 0, y: 18, scale: 0.985, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -12, scale: 0.99, filter: 'blur(4px)' }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                {screen === 'MAIN_MENU' && (
                  <MainMenu
                    teamCount={teams.length}
                    onMultiplayer={() => setScreen('MULTIPLAYER')}
                    onCpu={() => setScreen('CPU')}
                    onTeambuilder={() => openTeambuilder('Boxes')}
                    onDamageCalc={() => openTeambuilder('Damage Calc')}
                  />
                )}
                {screen === 'MULTIPLAYER' && (
                  <Lobby
                    format={format}
                    onFormatChange={setFormat}
                    team={activeTeam}
                    teams={teams}
                    activeTeamIdx={activeTeamIdx}
                    onSelectTeamIdx={setActiveTeamIdx}
                    onBackToMenu={() => setScreen('MAIN_MENU')}
                    onStartGame={handleStartGame}
                  />
                )}
                {screen === 'CPU' && (
                  <CpuSetup onStart={(f) => { setFormat(f); handleStartGame(true, 'LOCAL_SOLO'); }} />
                )}
                {screen === 'TEAMBUILDER' && (
                  <TeambuilderHub
                    initialTab={tbTab}
                    activeTeam={activeTeam}
                    pcBox={pcBox}
                    teams={teams}
                    onUpdateTeam={handleUpdateActiveTeam}
                    onUpdatePcBox={setPcBox}
                    onUpdateTeams={setTeams}
                    onUpdatePokemon={handleUpdatePokemonInRoster}
                    onBackToMenu={() => setScreen('MAIN_MENU')}
                  />
                )}
                {screen === 'PROFILE' && <ProfileScreen />}
                {screen === 'BATTLE' && (
                  <BattleScreen
                    format={format}
                    playerTeam={activeTeam}
                    isHost={isHost}
                    roomId={roomId}
                    onExit={() => setScreen('MAIN_MENU')}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </main>
          <MusicPopover />
          <SettingsPanel />
        </>
      )}
    </div>
  );
}

export default App;
