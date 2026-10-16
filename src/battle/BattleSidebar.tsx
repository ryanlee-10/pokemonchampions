import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, ScrollText, Send, X, Sparkles, ArrowUp, ArrowDown } from 'lucide-react';
import type { LogMeta } from '../engine/battleEngine';
import { peerManager } from '../network/peerManager';

export interface ChatMessage {
  id: string;
  sender: string;
  isMe: boolean;
  text: string;
  time: string;
}

interface BattleSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  turn: number;
  battleLog: { text: string; meta?: LogMeta }[];
  isMultiplayer: boolean;
  opponentName?: string;
}

export const BattleSidebar: React.FC<BattleSidebarProps> = ({
  isOpen,
  onClose,
  turn,
  battleLog,
  isMultiplayer,
  opponentName = 'Opponent',
}) => {
  const [activeTab, setActiveTab] = useState<'LOG' | 'CHAT'>('LOG');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'System',
      isMe: false,
      text: 'Battle connected. Good luck, Trainers!',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const logEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll log
  useEffect(() => {
    if (activeTab === 'LOG' && isOpen) {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [battleLog, activeTab, isOpen]);

  // Auto-scroll chat
  useEffect(() => {
    if (activeTab === 'CHAT' && isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab, isOpen]);

  // Handle incoming chat messages over PeerJS
  useEffect(() => {
    if (!isMultiplayer) return;

    const handleMsg = (msg: any) => {
      if (msg.type === 'CHAT_MESSAGE') {
        setChatMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}-${Math.random()}`,
            sender: msg.payload.sender || opponentName,
            isMe: false,
            text: msg.payload.text,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    };

    peerManager.addMessageListener?.(handleMsg);
    return () => {
      peerManager.removeMessageListener?.(handleMsg);
    };
  }, [isMultiplayer, opponentName]);

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'You',
      isMe: true,
      text: inputText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, newMsg]);

    if (isMultiplayer) {
      peerManager.sendMessage('CHAT_MESSAGE', { text: inputText.trim(), sender: 'Player' });
    }

    setInputText('');
  };

  const sendQuickChat = (phrase: string) => {
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'You',
      isMe: true,
      text: phrase,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, newMsg]);

    if (isMultiplayer) {
      peerManager.sendMessage('CHAT_MESSAGE', { text: phrase, sender: 'Player' });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop blur on small screens */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 75,
              background: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(3px)',
            }}
          />

          {/* Slide-out Drawer Panel */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: 'clamp(320px, 28vw, 420px)',
              zIndex: 80,
              background: 'linear-gradient(180deg, rgba(8, 9, 24, 0.96) 0%, rgba(14, 15, 36, 0.98) 100%)',
              borderLeft: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '-12px 0 36px rgba(0, 0, 0, 0.75)',
              display: 'flex',
              flexDirection: 'column',
              fontFamily: "var(--font-display, 'Outfit', sans-serif)",
              backdropFilter: 'blur(16px)',
              userSelect: 'none',
            }}
          >
            {/* Header with Dual Tabs */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 1.25rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.02)',
              }}
            >
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setActiveTab('LOG')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.45rem 0.9rem',
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    border: 'none',
                    background: activeTab === 'LOG' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                    color: activeTab === 'LOG' ? '#a5b4fc' : 'rgba(255, 255, 255, 0.6)',
                    outline: activeTab === 'LOG' ? '1px solid rgba(99, 102, 241, 0.5)' : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  <ScrollText size={16} />
                  <span>Battle Log</span>
                </button>

                <button
                  onClick={() => setActiveTab('CHAT')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.45rem 0.9rem',
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    border: 'none',
                    background: activeTab === 'CHAT' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                    color: activeTab === 'CHAT' ? '#7dd3fc' : 'rgba(255, 255, 255, 0.6)',
                    outline: activeTab === 'CHAT' ? '1px solid rgba(56, 189, 248, 0.5)' : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  <MessageSquare size={16} />
                  <span>Chat</span>
                </button>
              </div>

              <button
                onClick={onClose}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  display: 'grid',
                  placeItems: 'center',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* TAB CONTENT: BATTLE LOG */}
            {activeTab === 'LOG' && (
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                }}
              >
                <div
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'rgba(255, 255, 255, 0.5)',
                    textAlign: 'center',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  Turn {turn > 0 ? turn : 1} In Progress
                </div>

                {battleLog.map((log, idx) => {
                  const isAbility = log.meta?.kind === 'ability' || log.text.includes('Ability:') || log.text.includes('Trace') || log.text.includes('Intimidate') || log.text.includes('Surge');
                  const isStatDown = log.meta?.kind === 'stat' && log.meta.dir === 'down' || log.text.includes('fell') || log.text.includes('dropped') || log.text.includes('lowered');
                  const isStatUp = log.meta?.kind === 'stat' && log.meta.dir === 'up' || log.text.includes('rose') || log.text.includes('boosted');
                  const isWeatherTerrain = log.text.includes('rain') || log.text.includes('sun') || log.text.includes('terrain');
                  const isFainted = log.text.includes('fainted');

                  return (
                    <div
                      key={`log-${idx}`}
                      style={{
                        padding: '0.65rem 0.85rem',
                        borderRadius: '12px',
                        background: isAbility
                          ? 'rgba(168, 85, 247, 0.12)'
                          : isStatDown
                          ? 'rgba(14, 116, 144, 0.15)'
                          : isStatUp
                          ? 'rgba(234, 88, 12, 0.15)'
                          : isFainted
                          ? 'rgba(244, 63, 94, 0.18)'
                          : isWeatherTerrain
                          ? 'rgba(16, 185, 129, 0.14)'
                          : 'rgba(255, 255, 255, 0.03)',
                        borderLeft: `4px solid ${
                          isAbility
                            ? '#c084fc'
                            : isStatDown
                            ? '#38bdf8'
                            : isStatUp
                            ? '#fb923c'
                            : isFainted
                            ? '#f43f5e'
                            : isWeatherTerrain
                            ? '#34d399'
                            : 'rgba(255, 255, 255, 0.15)'
                        }`,
                        fontSize: '0.85rem',
                        lineHeight: 1.4,
                        color: isFainted ? '#fecdd3' : '#e2e8f0',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.15rem' }}>
                        {isAbility && <Sparkles size={14} color="#c084fc" />}
                        {isStatDown && <ArrowDown size={14} color="#38bdf8" />}
                        {isStatUp && <ArrowUp size={14} color="#fb923c" />}
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.45)' }}>
                          {isAbility ? 'Ability' : isStatDown ? 'Stat Drop' : isStatUp ? 'Stat Boost' : isFainted ? 'Faint' : isWeatherTerrain ? 'Field' : 'Action'}
                        </span>
                      </div>
                      <div style={{ fontWeight: 600 }}>{log.text}</div>
                    </div>
                  );
                })}
                <div ref={logEndRef} />
              </div>
            )}

            {/* TAB CONTENT: CHAT */}
            {activeTab === 'CHAT' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Chat message stream */}
                <div
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem',
                  }}
                >
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      style={{
                        alignSelf: msg.isMe ? 'flex-end' : 'flex-start',
                        maxWidth: '82%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: msg.isMe ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <span style={{ fontSize: '0.68rem', color: 'rgba(255, 255, 255, 0.45)', marginBottom: '0.15rem' }}>
                        {msg.sender} • {msg.time}
                      </span>
                      <div
                        style={{
                          padding: '0.6rem 0.9rem',
                          borderRadius: '16px',
                          borderBottomRightRadius: msg.isMe ? '4px' : '16px',
                          borderBottomLeftRadius: msg.isMe ? '16px' : '4px',
                          background: msg.isMe
                            ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
                            : 'rgba(255, 255, 255, 0.08)',
                          color: '#fff',
                          fontSize: '0.88rem',
                          fontWeight: 500,
                          wordBreak: 'break-word',
                          boxShadow: msg.isMe ? '0 4px 12px rgba(99, 102, 241, 0.35)' : 'none',
                        }}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                {/* Quick Chat Pills */}
                <div
                  style={{
                    display: 'flex',
                    gap: '0.4rem',
                    padding: '0.5rem 0.8rem',
                    overflowX: 'auto',
                    background: 'rgba(0, 0, 0, 0.25)',
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  {['Good luck!', 'Nice move!', 'GG!', 'Well played!'].map((phrase) => (
                    <button
                      key={phrase}
                      onClick={() => sendQuickChat(phrase)}
                      style={{
                        padding: '0.3rem 0.65rem',
                        borderRadius: '999px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: 'rgba(255, 255, 255, 0.8)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {phrase}
                    </button>
                  ))}
                </div>

                {/* Input Bar */}
                <form
                  onSubmit={handleSendMessage}
                  style={{
                    display: 'flex',
                    gap: '0.5rem',
                    padding: '0.75rem 1rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(255, 255, 255, 0.02)',
                  }}
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type a message..."
                    style={{
                      flex: 1,
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '12px',
                      padding: '0.6rem 0.85rem',
                      color: '#fff',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '0 0.9rem',
                      color: '#fff',
                      cursor: 'pointer',
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    <Send size={16} />
                  </button>
                </form>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
