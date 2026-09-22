import React, { useState, useRef, useEffect } from 'react';
import { HELD_ITEMS } from '../data/items';
import { Search, ChevronDown, Lock } from 'lucide-react';

interface ItemSelectProps {
  value: string;
  onChange: (itemId: string) => void;
  takenItemMap?: Record<string, string>; // itemId -> Pokemon name holding it
  enforceItemClause?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const ItemSelect: React.FC<ItemSelectProps> = ({
  value,
  onChange,
  takenItemMap = {},
  enforceItemClause = true,
  className = '',
  style = {}
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedItem = HELD_ITEMS.find((item) => item.id === value) || {
    id: value || 'none',
    name: value ? value.replace(/_/g, ' ') : 'None'
  };

  const filteredItems = [
    { id: 'none', name: 'None (No Item)' },
    ...HELD_ITEMS
  ].filter((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (itemId: string) => {
    onChange(itemId);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', ...style }} className={className}>
      <div
        className="input-base"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          padding: '0.4rem 0.75rem',
          width: '100%'
        }}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
      >
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {selectedItem.name}
        </span>
        <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
      </div>

      {isOpen && (
        <div
          className="glass-panel"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            width: '260px',
            zIndex: 9999,
            marginTop: '0.25rem',
            padding: '0.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            boxShadow: '0 10px 25px rgba(0,0,0,0.7)',
            backgroundColor: '#0f172a',
            border: '1px solid rgba(255,255,255,0.15)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ position: 'relative' }}>
            <Search
              size={12}
              style={{
                position: 'absolute',
                left: '0.5rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }}
            />
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-base"
              style={{ paddingLeft: '1.5rem', fontSize: '0.75rem', width: '100%' }}
              autoFocus
            />
          </div>

          <div
            style={{
              maxHeight: '180px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem'
            }}
          >
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => {
                const isCurrent = item.id === value;
                const heldBy = enforceItemClause && item.id !== 'none' && !isCurrent ? takenItemMap[item.id] : null;
                const isDisabled = Boolean(heldBy);

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (!isDisabled) handleSelect(item.id);
                    }}
                    title={isDisabled ? `Item Clause: Already held by ${heldBy}` : ''}
                    style={{
                      padding: '0.4rem 0.5rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      borderRadius: 'var(--radius-sm)',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      backgroundColor: isCurrent ? 'var(--primary)' : 'transparent',
                      color: isDisabled ? 'rgba(255,255,255,0.3)' : isCurrent ? '#fff' : 'var(--text)',
                      opacity: isDisabled ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'background 0.2s'
                    }}
                    onMouseOver={(e) => {
                      if (!isCurrent && !isDisabled) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                    }}
                    onMouseOut={(e) => {
                      if (!isCurrent && !isDisabled) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <span>{item.name}</span>
                    {heldBy && (
                      <span
                        style={{
                          fontSize: '0.65rem',
                          color: '#f87171',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.2rem',
                          marginLeft: '0.5rem'
                        }}
                      >
                        <Lock size={10} /> Held by {heldBy}
                      </span>
                    )}
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                No items found.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
