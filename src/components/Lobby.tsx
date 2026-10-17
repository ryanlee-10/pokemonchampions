import React, { useState } from 'react';
import { motion } from 'motion/react';
import type { BattleFormat, CustomPokemon, PlayerTeam } from '../types/pokemon';
import { POKEMON_ROSTER } from '../data/pokemonRoster';
import { peerManager } from '../network/peerManager';
import { Swords, Copy, Check, Sparkles, ArrowLeft, Dices, Crown, Radio, Bot, Zap } from 'lucide-react';
import { TypeBadge } from '../intro/TypeRing';
import '../styles/arena-menus.css';

interface LobbyProps {
  format: BattleFormat;
  onFormatChange: (format: BattleFormat) => void;
  team: CustomPokemon[];
  teams?: PlayerTeam[];
  activeTeamIdx?: number;
  onSelectTeamIdx?: (idx: number) => void;
  onBackToMenu: () => void;
  onStartGame: (isHost: boolean, roomId: string) => void;
}

export const Lobby: React.FC<LobbyProps> = ({
  format,
  onFormatChange,
  team,
  teams = [],
  activeTeamIdx = 0,
  onSelectTeamIdx,
  onBackToMenu,
  onStartGame,
}) => {
  const [roomCode, setRoomCode] = useState<string>('');
  const [customHostCode, setCustomHostCode] = useState<string>('');
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<
    'IDLE' | 'HOSTING' | 'CONNECTING' | 'CONNECTED'
  >('IDLE');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Item Clause calculation
  const itemCounts: Record<string, number> = {};
  team.forEach((p) => {
    if (p.item && p.item !== 'none') {
      itemCounts[p.item] = (itemCounts[p.item] || 0) + 1;
    }
  });
  const duplicateItemIds = Object.keys(itemCounts).filter((id) => itemCounts[id] > 1);
  const isItemClauseValid = duplicateItemIds.length === 0;

  const generateRoomCode = () => {
    return 'CHAMP-' + Math.floor(1000 + Math.random() * 9000);
  };

  const handleRandomizeHostCode = () => {
    setCustomHostCode(generateRoomCode());
  };

  const handleCreateRoom = async () => {
    const rawCode = customHostCode.trim();
    const code = rawCode ? rawCode.toUpperCase().replace(/[^A-Z0-9\-_]/g, '') : generateRoomCode();
    setRoomCode(code);
    setConnectionStatus('HOSTING');
    setErrorMessage('');

    try {
      await peerManager.init(
        code,
        () => {
          setConnectionStatus('CONNECTED');
        },
        (msg) => {
          if (msg.type === 'GAME_START') {
            onStartGame(true, code);
          }
        },
        () => {
          setConnectionStatus('IDLE');
          setErrorMessage('Peer disconnected.');
        }
      );
    } catch (err: any) {
      setErrorMessage('Failed to create room: ' + (err.message || 'Error'));
      setConnectionStatus('IDLE');
    }
  };

  const handleJoinRoom = async () => {
    if (!joinCodeInput.trim()) return;
    const targetCode = joinCodeInput.trim().toUpperCase();
    setConnectionStatus('CONNECTING');
    setErrorMessage('');

    try {
      await peerManager.init(
        undefined,
        undefined,
        (msg) => {
          if (msg.type === 'GAME_START') {
            if (msg.payload?.format && msg.payload.format !== format) {
              onFormatChange(msg.payload.format);
            }
            onStartGame(false, targetCode);
          }
        },
        () => {
          setConnectionStatus('IDLE');
          setErrorMessage('Disconnected from host.');
        }
      );
      await peerManager.connectToHost(targetCode);
      setConnectionStatus('CONNECTED');
      setRoomCode(targetCode);
    } catch {
      setErrorMessage('Could not connect to room code. Ensure host is waiting!');
      setConnectionStatus('IDLE');
    }
  };

  const handleCopyCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleCancelHosting = () => {
    peerManager.disconnect();
    setConnectionStatus('IDLE');
    setRoomCode('');
    setErrorMessage('');
  };

  const handleLaunchBattle = () => {
    if (!isItemClauseValid) {
      setErrorMessage(
        `Item Clause Violation: Duplicate item (${duplicateItemIds.join(', ')}) detected on your team! Each Pokémon must hold a unique item.`
      );
      return;
    }
    if (connectionStatus === 'CONNECTED') {
      if (peerManager.isHost) {
        peerManager.sendMessage('GAME_START', { format });
        onStartGame(true, roomCode);
      }
    } else {
      onStartGame(true, 'LOCAL_SOLO');
    }
  };

  return (
    <div className="arena-menu-scene animate-in">
      <div className="arena-bg-watermark" aria-hidden />

      {/* Top Header */}
      <header className="arena-header-bar">
        <div className="arena-header-left">
          <button className="arena-back-btn" onClick={onBackToMenu} title="Return to Main Menu">
            <ArrowLeft size={16} /> Main Menu
          </button>
          <div className="arena-title-wrap">
            <h1>Multiplayer Battle Lobby</h1>
            <p>Direct WebRTC peer-to-peer cloud relay • Zero port-forwarding required</p>
          </div>
        </div>

        <div className="arena-header-badge">
          <Sparkles size={14} /> Cloud Relay P2P Live
        </div>
      </header>

      {/* 2-Column Panoramic Layout */}
      <div className="arena-grid-layout">
        {/* Left Column: Format & Deployed Battle Team */}
        <motion.div
          className="arena-card-panel"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="arena-panel-title">
            <h2><Swords size={18} /> Battle Format & Team</h2>
            <span style={{ fontSize: '11px', color: 'var(--z-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>
              CURRENT SELECTION
            </span>
          </div>

          {/* Format selection cards */}
          <div className="format-select-grid">
            <div
              className={`format-box-card ${format === 'Singles' ? 'active-orange' : ''}`}
              onClick={() => onFormatChange('Singles')}
              role="button"
              tabIndex={0}
            >
              <div className="format-box-top">
                <div className="format-badge-big">1 v 1</div>
                <div className="format-badge-sub">Singles</div>
              </div>
              <img
                src="https://play.pokemonshowdown.com/sprites/ani/dragapult.gif"
                alt="Singles"
                className="format-box-mascot"
                draggable={false}
              />
              <div className="format-box-info">
                <h3>Singles (1v1)</h3>
                <p>1 active on field. Bring 6, pick 3 to battle.</p>
              </div>
            </div>

            <div
              className={`format-box-card ${format === 'Doubles' ? 'active' : ''}`}
              onClick={() => onFormatChange('Doubles')}
              role="button"
              tabIndex={0}
            >
              <div className="format-box-top">
                <div className="format-badge-big">2 v 2</div>
                <div className="format-badge-sub">Doubles VGC</div>
              </div>
              <img
                src="https://play.pokemonshowdown.com/sprites/ani/rillaboom.gif"
                alt="Doubles"
                className="format-box-mascot"
                draggable={false}
              />
              <div className="format-box-info">
                <h3>Doubles (2v2)</h3>
                <p>Official VGC rules. 2 active Pokémon. Bring 6, pick 4.</p>
              </div>
            </div>
          </div>

          {/* Deployed Party Roster Header */}
          <div className="team-select-header">
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Active Party ({team.length}/6)
            </span>
            {teams.length > 0 && onSelectTeamIdx && (
              <select
                className="team-dropdown"
                value={activeTeamIdx}
                onChange={(e) => onSelectTeamIdx(Number(e.target.value))}
              >
                {teams.map((t, idx) => (
                  <option key={idx} value={idx}>
                    {t.name} ({t.pokemon.length}/6)
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 6-Pokemon Roster Grid */}
          <div className="team-mon-grid">
            {team.length > 0 ? (
              team.slice(0, 6).map((mon) => {
                const spec = POKEMON_ROSTER.find((s) => s.id === mon.speciesId);
                const types = spec?.types || ['Normal'];
                const sprite = spec?.spriteUrl || `https://play.pokemonshowdown.com/sprites/gen5/${mon.speciesId}.png`;
                const itemClean = mon.item && mon.item !== 'none' ? mon.item.replace(/_/g, ' ') : 'No item';

                return (
                  <div key={mon.id} className="mon-slot-card">
                    <img src={sprite} alt={mon.nickname} className="mon-slot-sprite" />
                    <div className="mon-slot-details">
                      <div className="mon-slot-name">{mon.nickname}</div>
                      <div className="mon-slot-sub">
                        <span className="mon-slot-item">{itemClean}</span>
                      </div>
                    </div>
                    <div className="mon-slot-types">
                      {types.map((t) => (
                        <TypeBadge key={t} type={t} size={18} />
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ gridColumn: '1 / -1', padding: '24px', textAlign: 'center', color: 'var(--z-muted)' }}>
                No Pokémon found in team.
              </div>
            )}
          </div>

          {/* Item clause check banner */}
          <div style={{ marginTop: 'auto' }}>
            {isItemClauseValid ? (
              <div className="item-clause-badge">
                <span>✓</span> Item Clause Validated (All Pokémon hold unique items)
              </div>
            ) : (
              <div className="item-clause-badge invalid">
                <span>⚠️</span> Duplicate item detected ({duplicateItemIds.join(', ')}). Unique items required for battle.
              </div>
            )}
          </div>
        </motion.div>

        {/* Right Column: Multiplayer Connection Console */}
        <motion.div
          className="arena-card-panel"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <div className="arena-panel-title">
            <h2><Radio size={18} /> Peer Connection Console</h2>
            <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 800, letterSpacing: '0.06em' }}>
              {connectionStatus}
            </span>
          </div>

          {/* STATE: IDLE */}
          {connectionStatus === 'IDLE' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="mp-console-grid">
                {/* Host Subpanel */}
                <div className="mp-subpanel">
                  <h4><Crown size={16} color="#fbbf24" /> Host Arena</h4>
                  <p>Generate a room code or enter your own custom phrase to host a match.</p>

                  <div className="mp-input-row">
                    <input
                      type="text"
                      placeholder="CHAMP-XXXX or Custom"
                      value={customHostCode}
                      onChange={(e) => setCustomHostCode(e.target.value.toUpperCase())}
                      className="mp-input"
                    />
                    <button
                      className="mp-icon-btn"
                      type="button"
                      title="Generate Random Code"
                      onClick={handleRandomizeHostCode}
                    >
                      <Dices size={18} />
                    </button>
                  </div>

                  <button className="mp-action-btn primary" onClick={handleCreateRoom}>
                    <Crown size={16} /> Create Host Room
                  </button>
                </div>

                {/* Join Subpanel */}
                <div className="mp-subpanel">
                  <h4><Swords size={16} color="#38bdf8" /> Join Arena</h4>
                  <p>Enter the room code shared by your friend to link up instantly.</p>

                  <div className="mp-input-row">
                    <input
                      type="text"
                      placeholder="CHAMP-XXXX"
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value)}
                      className="mp-input"
                    />
                  </div>

                  <button className="mp-action-btn secondary" onClick={handleJoinRoom}>
                    <Swords size={16} /> Connect to Host
                  </button>
                </div>
              </div>

              {/* Practice vs AI shortcut */}
              <div style={{ marginTop: 'auto', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#f1f5f9' }}>Testing solo while waiting?</div>
                  <div style={{ fontSize: '12px', color: 'var(--z-muted)' }}>Launch an offline practice match against the CPU in {format} format.</div>
                </div>
                <button
                  className="arena-back-btn"
                  onClick={handleLaunchBattle}
                  style={{ whiteSpace: 'nowrap', padding: '10px 18px', background: 'rgba(255, 122, 61, 0.15)', borderColor: 'rgba(255, 122, 61, 0.35)', color: '#ff9a3d' }}
                >
                  <Bot size={15} /> Practice vs CPU
                </button>
              </div>
            </div>
          )}

          {/* STATE: HOSTING */}
          {connectionStatus === 'HOSTING' && (
            <div className="hosting-beacon-card">
              <div className="hosting-radar-ping">
                <Radio size={28} />
              </div>

              <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 6px 0', color: '#fff' }}>
                Waiting for Challenger...
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--z-muted)', margin: '0 0 16px 0' }}>
                Share this room code with your opponent. The match links automatically.
              </p>

              <div>
                <div className="room-code-display">
                  <span>{roomCode}</span>
                  <button
                    className="mp-icon-btn"
                    onClick={handleCopyCode}
                    title="Copy Code"
                    style={{ padding: '8px 12px' }}
                  >
                    {isCopied ? <Check size={18} color="#34d399" /> : <Copy size={18} />}
                  </button>
                </div>
              </div>

              {isCopied && (
                <div style={{ fontSize: '12px', color: '#34d399', fontWeight: 700, marginBottom: '12px' }}>
                  ✓ Copied to clipboard! Send to your friend.
                </div>
              )}

              <div style={{ marginTop: '20px' }}>
                <button className="mp-action-btn secondary" onClick={handleCancelHosting} style={{ width: 'auto', margin: '0 auto', padding: '8px 24px' }}>
                  Cancel Room
                </button>
              </div>
            </div>
          )}

          {/* STATE: CONNECTING */}
          {connectionStatus === 'CONNECTING' && (
            <div className="hosting-beacon-card">
              <div className="hosting-radar-ping">
                <Zap size={28} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 8px 0', color: '#38bdf8' }}>
                Establishing P2P Relay...
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--z-muted)' }}>
                Connecting to room host. Exchanging WebRTC session descriptors...
              </p>
            </div>
          )}

          {/* STATE: CONNECTED */}
          {connectionStatus === 'CONNECTED' && (
            <div className="connected-faceoff-card">
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '999px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontSize: '13px', fontWeight: 800, marginBottom: '12px' }}>
                <Sparkles size={16} /> CHALLENGER LINKED!
              </div>

              <div className="faceoff-versus-row">
                <div className="faceoff-player">
                  <div className="faceoff-avatar">🎮</div>
                  <strong style={{ fontSize: '14px', color: '#fff' }}>You (Player 1)</strong>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>{team.length} Pokémon</span>
                </div>

                <div className="faceoff-vs">VS</div>

                <div className="faceoff-player">
                  <div className="faceoff-avatar challenger">⚔️</div>
                  <strong style={{ fontSize: '14px', color: '#fff' }}>Challenger</strong>
                  <span style={{ fontSize: '11px', color: '#34d399' }}>Connected</span>
                </div>
              </div>

              {peerManager.isHost ? (
                <div>
                  <p style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '16px' }}>
                    You are the room host. When both players are ready, launch the arena battle!
                  </p>
                  <button
                    className="arena-launch-btn"
                    onClick={handleLaunchBattle}
                  >
                    <Crown size={22} fill="currentColor" />
                    LAUNCH MULTIPLAYER BATTLE ({format.toUpperCase()})
                  </button>
                </div>
              ) : (
                <div style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '14px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#38bdf8', marginBottom: '4px' }}>
                    Awaiting Room Host to Launch
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Format: <strong style={{ color: '#fff' }}>{format}</strong>. Stand by!
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div style={{ marginTop: '16px', padding: '12px 16px', borderRadius: '12px', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.35)', color: '#fb7185', fontSize: '13px', fontWeight: 600 }}>
              {errorMessage}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};
