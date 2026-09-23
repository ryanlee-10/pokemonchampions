import React, { useState } from 'react';
import type { BattleFormat, CustomPokemon, PlayerTeam } from '../types/pokemon';
import { POKEMON_ROSTER } from '../data/pokemonRoster';
import { peerManager } from '../network/peerManager';
import { Swords, Users, Copy, Check, Sparkles, ArrowLeft, ShieldCheck, AlertTriangle, Dices, Crown } from 'lucide-react';


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
  teams,
  activeTeamIdx = 0,
  onSelectTeamIdx,
  onBackToMenu,
  onStartGame
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
    // Allow custom alphanumeric codes with dashes/underscores, or fallback to auto-generated
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

  const handleLaunchBattle = () => {
    if (!isItemClauseValid) {
      setErrorMessage(`Item Clause Violation: Duplicate item (${duplicateItemIds.join(', ')}) detected on your team! Each Pokémon must hold a unique item.`);
      return;
    }
    if (connectionStatus === 'CONNECTED') {
      if (peerManager.isHost) {
        peerManager.sendMessage('GAME_START', { format });
        onStartGame(true, roomCode);
      }
      // Note: non-hosts cannot launch; they await GAME_START from host
    } else {
      onStartGame(true, 'LOCAL_SOLO');
    }
  };


  return (
    <div className="lobby-scene animate-in">
      <div className="glass-card" style={{ width: '100%', maxWidth: '700px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={onBackToMenu}>
            <ArrowLeft size={16} /> Main Menu
          </button>
          <div className="hero-badge" style={{ margin: 0, padding: '0.2rem 0.8rem', fontSize: '0.75rem' }}>
            <Sparkles size={14} /> Cloud Relay P2P
          </div>
        </div>

        <h1 className="lobby-title">Battle Lobby</h1>
        <p className="lobby-subtitle">
          Play 1v1 Singles or 2v2 Doubles over the free cloud WebRTC relay server using room codes.
        </p>

        <div className="format-options">
          <div
            className={`format-card ${format === 'Singles' ? 'active' : ''}`}
            onClick={() => onFormatChange('Singles')}
          >
            <div className="format-icon"><Swords size={24} /></div>
            <div style={{ textAlign: 'left' }}>
              <div className="format-name">Singles (1v1)</div>
              <div className="format-desc">1 active Pokémon on field</div>
            </div>
          </div>

          <div
            className={`format-card ${format === 'Doubles' ? 'active' : ''}`}
            onClick={() => onFormatChange('Doubles')}
          >
            <div className="format-icon"><Users size={24} /></div>
            <div style={{ textAlign: 'left' }}>
              <div className="format-name">Doubles (2v2)</div>
              <div className="format-desc">Official VGC 2 active mons</div>
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1rem', marginBottom: '2rem', textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
              Active Battle Team
            </span>
            {teams && teams.length > 0 && (
              <select
                value={activeTeamIdx}
                onChange={(e) => onSelectTeamIdx?.(Number(e.target.value))}
                className="input-base"
                style={{ width: 'auto', padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}
              >
                {teams.map((t, i) => (
                  <option key={i} value={i}>
                    {t.name} ({t.pokemon.length}/6)
                  </option>
                ))}
              </select>
            )}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.2rem 0.6rem',
                borderRadius: '1rem',
                backgroundColor: isItemClauseValid ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.2)',
                border: `1px solid ${isItemClauseValid ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.5)'}`,
                color: isItemClauseValid ? '#4ade80' : '#f87171'
              }}
            >
              {isItemClauseValid ? (
                <>
                  <ShieldCheck size={13} /> Item Clause: Valid
                </>
              ) : (
                <>
                  <AlertTriangle size={13} /> Item Clause Violation
                </>
              )}
            </div>
          </div>


          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto' }}>
            {team.length > 0 ? (
              team.map((p) => {
                const spec = POKEMON_ROSTER.find((s) => s.id === p.speciesId);
                return (
                  <div key={p.id} style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)', padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <img src={spec?.spriteUrl} alt={p.nickname} style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{p.nickname}</span>
                  </div>
                );
              })
            ) : (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No team loaded</span>
            )}
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>Multiplayer Connect</h3>

          {connectionStatus === 'IDLE' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'left' }}>
                <h4 style={{ fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Crown size={18} color="var(--primary)" /> Host Match
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  Custom code or auto-generate:
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <input
                    type="text"
                    placeholder="CHAMP-XXXX or Custom"
                    value={customHostCode}
                    onChange={(e) => setCustomHostCode(e.target.value.toUpperCase())}
                    className="input-base"
                    style={{ flex: 1 }}
                  />
                  <button
                    className="btn-secondary"
                    type="button"
                    title="Generate Random Code"
                    onClick={handleRandomizeHostCode}
                    style={{ padding: '0.4rem 0.6rem' }}
                  >
                    <Dices size={18} />
                  </button>
                </div>
                <button className="btn-primary" style={{ width: '100%' }} onClick={handleCreateRoom}>
                  Create Room
                </button>
              </div>

              <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'left' }}>
                <h4 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Join Match</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Enter friend's code.</p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="CHAMP-XXXX or Custom"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value)}
                    className="input-base"
                    style={{ flex: 1 }}
                  />
                  <button className="btn-secondary" onClick={handleJoinRoom}>Join</button>
                </div>
              </div>
            </div>
          )}

          {connectionStatus === 'HOSTING' && (
            <div className="glass-panel" style={{ padding: '2rem', border: '1px solid var(--primary)' }}>
              <p style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: '1rem' }}>Waiting for opponent to connect...</p>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '2rem', fontFamily: 'var(--font-mono)', fontWeight: 800, letterSpacing: '2px' }}>{roomCode}</span>
                <button className="btn-secondary" onClick={handleCopyCode} title="Copy Code">
                  {isCopied ? <Check size={20} color="var(--accent-emerald)" /> : <Copy size={20} />}
                </button>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                Share this room code with your friend.
              </p>
            </div>
          )}

          {connectionStatus === 'CONNECTING' && (
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <p style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>Connecting to peer...</p>
            </div>
          )}

          {connectionStatus === 'CONNECTED' && (
            <div className="glass-panel" style={{ padding: '2rem', border: '1px solid var(--accent-emerald)' }}>
              <p style={{ fontWeight: 700, color: 'var(--accent-emerald)', fontSize: '1.2rem', marginBottom: '1rem' }}>
                🎉 Opponent Connected to Room <span style={{ fontFamily: 'var(--font-mono)' }}>{roomCode}</span>!
              </p>

              {peerManager.isHost ? (
                <div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                    You are the room creator. When both players are ready, launch the battle!
                  </p>
                  <button className="btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1rem' }} onClick={handleLaunchBattle}>
                    Start Pokémon Battle ({format})
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="hero-badge" style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', borderColor: 'rgba(56, 189, 248, 0.4)', color: '#38bdf8' }}>
                    <Sparkles size={16} /> Guest Connected
                  </div>
                  <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text)' }}>
                    Waiting for room creator to start the battle...
                  </p>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Format set by host: <strong style={{ color: 'var(--primary)' }}>{format}</strong>
                  </span>
                </div>
              )}
            </div>
          )}

          {errorMessage && <p style={{ color: 'var(--accent-rose)', marginTop: '1rem', fontSize: '0.9rem' }}>{errorMessage}</p>}
        </div>

        {connectionStatus === 'IDLE' && (
          <div style={{ marginTop: '2rem' }}>
            <button className="btn-ghost" onClick={handleLaunchBattle}>
              Practice vs AI CPU ({format})
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
