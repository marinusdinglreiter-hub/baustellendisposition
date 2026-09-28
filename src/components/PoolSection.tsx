import { useDroppable } from '@dnd-kit/core';
import { Ban } from 'lucide-react';
import type { PoolId, Personnel, Equipment } from '../types';
import { ResourceCard } from './ResourceCard';
import type { CardData } from './ResourceCard';
import { buildCards } from './cardData';

interface PoolConfig {
  id: PoolId;
  label: string;
  color: string;
  icon: string;
  accepts: ('personnel' | 'equipment')[];
}

export const poolConfigs: PoolConfig[] = [
  { id: 'verfuegbar', label: 'Verfügbares Personal', color: '#16a34a', icon: '👷', accepts: ['personnel'] },
  { id: 'krank', label: 'Krankenstand', color: '#dc2626', icon: '🏥', accepts: ['personnel'] },
  { id: 'schule', label: 'Schule / Ausbildung', color: '#7c3aed', icon: '📚', accepts: ['personnel'] },
  { id: 'frei', label: 'Frei / Urlaub', color: '#0891b2', icon: '🏖️', accepts: ['personnel'] },
  { id: 'nicht_verfuegbar', label: 'Nicht verfügbar', color: '#6b7280', icon: '🚫', accepts: ['personnel'] },
  { id: 'fuhrpark', label: 'Fuhrpark', color: '#525252', icon: '🚛', accepts: ['equipment'] },
  { id: 'maschinenpark', label: 'Maschinenpark', color: '#a16207', icon: '⚙️', accepts: ['equipment'] },
  { id: 'in_reparatur', label: 'In Reparatur', color: '#dc2626', icon: '🔧', accepts: ['equipment'] },
  { id: 'ausser_betrieb', label: 'Außer Betrieb', color: '#6b7280', icon: '⛔', accepts: ['equipment'] },
];

export function PoolSection({
  config,
  personnel,
  equipment,
  isOpen = false,
  isBlocked = false,
  isBlockedHover = false,
  isDragging = false,
  onToggle,
}: {
  config: PoolConfig;
  personnel: Personnel[];
  equipment: Equipment[];
  isOpen?: boolean;
  isBlocked?: boolean;
  isBlockedHover?: boolean;
  isDragging?: boolean;
  /** Klick auf die Kopfzeile klappt die Reihe auf und zu */
  onToggle?: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: config.id,
    data: { type: 'pool', poolId: config.id },
  });

  const allCards: CardData[] = buildCards(personnel, equipment);
  const totalCount = allCards.length;

  // Visual states
  const isValidHover = isOver && !isBlocked;
  const isInvalidHover = isBlockedHover;

  let borderColor = '2px solid #e5e7eb';
  let bgColor = '#fff';

  if (isDragging && isBlocked) {
    borderColor = '2px solid #e5e7eb';
    bgColor = '#f9fafb';
  }
  if (isValidHover) {
    borderColor = '2px solid #0284c7';
    bgColor = '#e0f2fe';
  }
  if (isInvalidHover) {
    borderColor = '2px solid #dc2626';
    bgColor = '#fef2f2';
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        borderRadius: 10,
        border: borderColor,
        backgroundColor: bgColor,
        overflow: 'hidden',
        transition: 'border-color 0.15s, background-color 0.15s, opacity 0.15s',
        opacity: isDragging && isBlocked ? 0.5 : 1,
        position: 'relative',
      }}
    >
      {/* Sperr-Overlay bei ungültigem Hover */}
      {isInvalidHover && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(220, 38, 38, 0.08)',
            zIndex: 10,
            borderRadius: 10,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: '#dc2626',
              color: '#fff',
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              boxShadow: '0 2px 8px rgba(220,38,38,0.3)',
            }}
          >
            <Ban size={16} />
            Nicht erlaubt
          </div>
        </div>
      )}

      {/* Sperr-Icon bei ausgegrautem Zustand (während Drag) */}
      {isDragging && isBlocked && !isInvalidHover && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 10,
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          <Ban size={16} color="#9ca3af" />
        </div>
      )}

      {/* Pool-Header: klickbar, klappt die Reihe auf und zu. Der Pfeil
          darueber tut dasselbe – auf das Symbol oder den Namen zu tippen ist
          nur der naheliegendere Weg. */}
      <div
        onClick={onToggle}
        role={onToggle ? 'button' : undefined}
        tabIndex={onToggle ? 0 : undefined}
        aria-expanded={onToggle ? isOpen : undefined}
        onKeyDown={(e) => {
          if (!onToggle) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        title={onToggle ? (isOpen ? 'Zuklappen' : 'Aufklappen') : undefined}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 14px',
          fontSize: 14,
          fontWeight: 600,
          color: isDragging && isBlocked ? '#9ca3af' : config.color,
          cursor: onToggle ? 'pointer' : 'default',
          userSelect: 'none',
        }}
      >
        <span>{config.icon}</span>
        <span>{config.label}</span>
        <span
          style={{
            marginLeft: 'auto',
            backgroundColor: isDragging && isBlocked ? '#9ca3af' : config.color,
            color: '#fff',
            borderRadius: 10,
            padding: '1px 8px',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {totalCount}
        </span>
      </div>

      {/* Animierter Inhalt */}
      <div
        style={{
          maxHeight: isOpen ? '1000px' : '0',
          overflow: 'hidden',
          transition: 'max-height 0.2s ease',
        }}
      >
        <div
          style={{
            padding: '4px 10px 10px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4,
          }}
        >
          {allCards.length === 0 && (
            <div style={{ color: '#9ca3af', fontSize: 12, padding: '8px 0' }}>
              Keine Ressourcen
            </div>
          )}
          {allCards.map((card) => (
            <div key={card.id} style={{ width: '100%', maxWidth: 280 }}>
              <ResourceCard data={card} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
