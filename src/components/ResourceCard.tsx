import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { CalendarClock, TriangleAlert } from 'lucide-react';
import type { PersonnelRole, EquipmentCategory, IconKey } from '../types';
import { getPersonnelVisual, getEquipmentVisual } from './resourceVisuals';
import type { VisualConfig } from './resourceVisuals';

interface PersonnelCardData {
  kind: 'personnel';
  id: string;
  displayName: string;
  role: PersonnelRole;
  autoAbsent: boolean;
}

interface EquipmentCardData {
  kind: 'equipment';
  id: string;
  displayName: string;
  category: EquipmentCategory;
  /** Kennzeichen, falls vorhanden – ersetzt auf der Karte das Kategorie-Label */
  licensePlate?: string;
  /** Bewusst in der Verwaltung gesetztes Symbol; sonst greift die Heuristik */
  iconKey?: IconKey;
  /** Naechster KFZ-Termin ist faellig oder ueberfaellig */
  appointmentWarning?: 'soon' | 'overdue';
}

export type CardData = PersonnelCardData | EquipmentCardData;

function getVisual(data: CardData): VisualConfig {
  if (data.kind === 'personnel') return getPersonnelVisual(data.role);
  return getEquipmentVisual(data.category, data.displayName, data.iconKey);
}

/**
 * Rechter Slot: bei Geraeten das Kennzeichen, wenn vorhanden, sonst die
 * Kategorie. Symbol und Farbe tragen die Kategorie ohnehin schon – das Label
 * ist also genau dann entbehrlich, wenn das Kennzeichen da ist. Und auf der
 * Tafel stehen mehrere Fahrzeuge desselben Fabrikats nebeneinander.
 */
function getTrailingLabel(data: CardData): string {
  if (data.kind === 'personnel') return data.role;
  return data.licensePlate || data.category;
}

function getTitle(data: CardData): string {
  if (data.kind === 'personnel') return `${data.displayName} · ${data.role}`;
  return [data.displayName, data.category, data.licensePlate].filter(Boolean).join(' · ');
}

export function ResourceCard({ data, overlay }: { data: CardData; overlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: data.id,
    data,
  });

  const config = getVisual(data);
  const isAutoAbsent = data.kind === 'personnel' && data.autoAbsent;
  const warning = data.kind === 'equipment' ? data.appointmentWarning : undefined;
  const isPlate = data.kind === 'equipment' && !!data.licensePlate;

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    border: config.border,
    backgroundColor: config.bg,
    borderRadius: 8,
    padding: '6px 10px',
    marginBottom: 4,
    cursor: 'grab',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    fontWeight:
      data.kind === 'personnel' && (data.role === 'Bauleitung' || data.role === 'Vorarbeiter')
        ? 700
        : 500,
    color: config.color,
    opacity: isDragging ? 0.4 : 1,
    touchAction: 'none',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    boxShadow: overlay ? '0 8px 20px rgba(0,0,0,0.25)' : undefined,
    zIndex: overlay ? 999 : undefined,
  };

  const Icon = config.Icon;

  const content = (
    <>
      <Icon size={14} color={config.iconColor} />
      {/* Der Name behaelt Vorrang: ohne minWidth quetscht ihn ein langes
          Kennzeichen auf null Breite und die Karte zeigt nur noch das Schild. */}
      <span
        style={{
          flex: '1 1 auto',
          minWidth: 40,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {data.displayName}
      </span>
      {isAutoAbsent && (
        <span title="Automatisch abwesend (Regel)" style={{ display: 'inline-flex', flexShrink: 0 }}>
          <CalendarClock size={13} style={{ opacity: 0.7 }} />
        </span>
      )}
      {warning && (
        <span
          title={warning === 'overdue' ? 'KFZ-Termin überfällig' : 'KFZ-Termin in den nächsten 14 Tagen'}
          style={{ display: 'inline-flex', flexShrink: 0, color: '#dc2626' }}
        >
          <TriangleAlert size={13} />
        </span>
      )}
      <span
        style={{
          fontSize: 10,
          opacity: 0.75,
          marginLeft: 'auto',
          flexShrink: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          textAlign: 'right',
          fontFamily: isPlate ? 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' : undefined,
          letterSpacing: isPlate ? 0.3 : undefined,
        }}
      >
        {getTrailingLabel(data)}
      </span>
    </>
  );

  if (overlay) {
    return (
      <div style={style} title={getTitle(data)}>
        {content}
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} title={getTitle(data)} {...listeners} {...attributes}>
      {content}
    </div>
  );
}
