import { useState } from 'react';
import type { BattleFormat, CustomPokemon, PlayerTeam } from './types/pokemon';
import { POKEMON_ROSTER } from './data/pokemonRoster';
import { MainMenu } from './components/MainMenu';
import { Lobby } from './components/Lobby';
import { TrainingScreen } from './components/TrainingScreen';
import { BoxesScreen } from './components/BoxesScreen';
import { BattleScreen } from './components/BattleScreen';
import { BattleCalculator } from './components/BattleCalculator';
import { Swords, Dumbbell, Package, Home, Calculator } from 'lucide-react';

type ViewMode = 'MAIN_MENU' | 'BATTLE_LOBBY' | 'TRAINING' | 'BOXES' | 'CALCULATOR' | 'BATTLE';


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
    moves: spec.learnset.slice(0, 4)
  };
}

export function App() {
  const [view, setView] = useState<ViewMode>('MAIN_MENU');
  const [format, setFormat] = useState<BattleFormat>('Doubles');
  
  const [teams, setTeams] = useState<PlayerTeam[]>(() => [
    {
      playerId: 'player',
      name: 'Alpha Squad',
      pokemon: ['pawmot', 'absol', 'politoed', 'excadrill', 'volcarona', 'maushold'].map(createStarterPokemon)
    }
  ]);
  const [activeTeamIdx, setActiveTeamIdx] = useState<number>(0);
  const [pcBox, setPcBox] = useState<CustomPokemon[]>(() =>
    POKEMON_ROSTER.map(p => createStarterPokemon(p.id))
  );

  const [isHost, setIsHost] = useState<boolean>(true);
  const [roomId, setRoomId] = useState<string>('LOCAL_SOLO');

  const activeTeam = teams[activeTeamIdx]?.pokemon || [];

  const handleUpdateActiveTeam = (newTeamPkmn: CustomPokemon[]) => {
    setTeams((prevTeams) =>
      prevTeams.map((t, idx) => (idx === activeTeamIdx ? { ...t, pokemon: newTeamPkmn } : t))
    );
  };

  const handleStartGame = (hostFlag: boolean, roomCode: string) => {
    setIsHost(hostFlag);
    setRoomId(roomCode);
    setView('BATTLE');
  };

  const handleUpdatePokemonInRoster = (updatedPkmn: CustomPokemon) => {
    handleUpdateActiveTeam(activeTeam.map((p) => (p.id === updatedPkmn.id ? updatedPkmn : p)));
    if (pcBox.some((p) => p.id === updatedPkmn.id)) {
      setPcBox(pcBox.map((p) => (p.id === updatedPkmn.id ? updatedPkmn : p)));
    }
  };

  const allPokemonForTraining = [...activeTeam, ...pcBox];

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="app-sidebar">
        <div
          className="brand-header"
          onClick={() => setView('MAIN_MENU')}
        >
          <Swords size={28} className="brand-icon" />
          <span className="brand-title">Pokémon<br/>Champions</span>
        </div>
        
        <nav className="sidebar-nav">
          <button
            className={`nav-button ${view === 'MAIN_MENU' ? 'active' : ''}`}
            onClick={() => setView('MAIN_MENU')}
          >
            <Home size={18} /> Main Menu
          </button>
          <button
            className={`nav-button ${view === 'BATTLE_LOBBY' ? 'active' : ''}`}
            onClick={() => setView('BATTLE_LOBBY')}
          >
            <Swords size={18} /> Battle
          </button>
          <button
            className={`nav-button ${view === 'TRAINING' ? 'active' : ''}`}
            onClick={() => setView('TRAINING')}
          >
            <Dumbbell size={18} /> Training
          </button>
          <button
            className={`nav-button ${view === 'BOXES' ? 'active' : ''}`}
            onClick={() => setView('BOXES')}
          >
            <Package size={18} /> Boxes
          </button>
          <button
            className={`nav-button ${view === 'CALCULATOR' ? 'active' : ''}`}
            onClick={() => setView('CALCULATOR')}
          >
            <Calculator size={18} /> Calculator
          </button>
        </nav>
      </aside>

      {/* Main Views */}
      <main className="app-main">
        {view === 'MAIN_MENU' && (
          <MainMenu
            onSelectBattle={() => setView('BATTLE_LOBBY')}
            onSelectTraining={() => setView('TRAINING')}
            onSelectBoxes={() => setView('BOXES')}
            onSelectCalculator={() => setView('CALCULATOR')}
            activeTeam={activeTeam}
            pcBoxCount={pcBox.length}
          />
        )}


        {view === 'BATTLE_LOBBY' && (
          <Lobby
            format={format}
            onFormatChange={setFormat}
            team={activeTeam}
            teams={teams}
            activeTeamIdx={activeTeamIdx}
            onSelectTeamIdx={setActiveTeamIdx}
            onBackToMenu={() => setView('MAIN_MENU')}
            onStartGame={handleStartGame}
          />
        )}

        {view === 'TRAINING' && (
          <TrainingScreen
            pokemonList={allPokemonForTraining}
            onUpdatePokemon={handleUpdatePokemonInRoster}
            onBackToMenu={() => setView('MAIN_MENU')}
          />
        )}

        {view === 'BOXES' && (
          <BoxesScreen
            activeTeam={activeTeam}
            pcBox={pcBox}
            teams={teams}
            onUpdateTeam={handleUpdateActiveTeam}
            onUpdatePcBox={setPcBox}
            onUpdateTeams={setTeams}
            onBackToMenu={() => setView('MAIN_MENU')}
          />
        )}

        {view === 'CALCULATOR' && (
          <BattleCalculator
            playerTeam={activeTeam}
            onBack={() => setView('MAIN_MENU')}
          />
        )}


        {view === 'BATTLE' && (
          <BattleScreen
            format={format}
            playerTeam={activeTeam}
            isHost={isHost}
            roomId={roomId}
            onExit={() => setView('MAIN_MENU')}
          />
        )}
      </main>
    </div>
  );
}

export default App;
