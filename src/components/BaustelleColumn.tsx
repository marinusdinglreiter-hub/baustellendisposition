import { useState, useRef, useEffect, useCallback } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { Baustelle, Personnel, Equipment, BaustelleAttachment } from '../types';
import { ResourceCard } from './ResourceCard';
import type { CardData } from './ResourceCard';
import { buildCards } from './cardData';
import { BaustelleFiles } from './BaustelleFiles';
import { Check } from 'lucide-react';

interface Props {
  baustelle: Baustelle;
  personnel: Personnel[];
  equipment: Equipment[];
  isBlocked?: boolean;
  onUpdateNotes?: (id: string, notes: string) => void;
  onUpdateAttachments?: (id: string, attachments: BaustelleAttachment[]) => void;
  /** Kopfzeile: Griff zum Umsortieren und Archivieren */
  headerExtras?: React.ReactNode;
}

export function BaustelleColumn({
  baustelle,
  personnel,
  equipment,
  isBlocked = false,
  onUpdateNotes,
  onUpdateAttachments,
  headerExtras,
}: Props) {
  const [notesFocused, setNotesFocused] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [localNotes, setLocalNotes] = useState(baustelle.notes);
  // Aenderungen von aussen (Snapshot-Wiederherstellung, Hallentab) nachziehen.
  // Abgleich waehrend des Renderns statt im Effekt – das ist das von React
  // dokumentierte Muster fuer "Zustand an eine geaenderte Prop anpassen" und
  // erspart den zusaetzlichen Render-Durchlauf, den ein Effekt ausloest.
  const [zuletztGesehen, setZuletztGesehen] = useState(baustelle.notes);
  if (baustelle.notes !== zuletztGesehen) {
    setZuletztGesehen(baustelle.notes);
    setLocalNotes(baustelle.notes);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (feedbackRef.current) clearTimeout(feedbackRef.current);
    };
  }, []);

  const saveNotes = useCallback(
    (value: string) => {
      if (onUpdateNotes && value !== baustelle.notes) {
        onUpdateNotes(baustelle.id, value);
        setSavedFeedback(true);
        if (feedbackRef.current) clearTimeout(feedbackRef.current);
        feedbackRef.current = setTimeout(() => setSavedFeedback(false), 2000);
      }
    },
    [onUpdateNotes, baustelle.id, baustelle.notes]
  );

  const handleNotesChange = (value: string) => {
    setLocalNotes(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveNotes(value), 500);
  };

  const handleBlur = () => {
    setNotesFocused(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    saveNotes(localNotes);
  };

  const { isOver, setNodeRef } = useDroppable({
    id: baustelle.id,
    data: { type: 'baustelle', baustelle },
  });

  const handleAttachments = useCallback(
    (next: BaustelleAttachment[]) => {
      onUpdateAttachments?.(baustelle.id, next);
    },
    [onUpdateAttachments, baustelle.id]
  );

  const allCards: CardData[] = buildCards(personnel, equipment);
  const isValidHover = isOver && !isBlocked;

  return (
    <div
      ref={setNodeRef}
      style={{
        minWidth: 220,
        maxWidth: 260,
        flexShrink: 0,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: isValidHover ? '#e0f2fe' : '#fff',
        border: isValidHover ? '2px solid #0284c7' : '2px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        transition: 'border-color 0.15s, background-color 0.15s',
      }}
    >
      {/* Kopfzeile */}
      <div
        style={{
          backgroundColor: baustelle.color,
          color: '#fff',
          padding: '8px 10px',
          letterSpacing: 0.3,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 4,
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          <span
            title={baustelle.name}
            style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}
          >
            {baustelle.name}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
            <span
              style={{
                fontSize: 10,
                backgroundColor: 'rgba(255,255,255,0.25)',
                borderRadius: 4,
                padding: '2px 6px',
              }}
            >
              {baustelle.status}
            </span>
            {headerExtras}
          </div>
        </div>

        {/* Adresse: damit die Leute auf dem Hof selbst nachsehen koennen,
            wohin sie muessen. Bewusst als Geschwister der Namenszeile – im
            Namens-span wuerde sie gegen dessen flex:1 und die eigene Ellipse
            arbeiten. opacity statt hellerer Farbe, damit sie auf allen 15
            Kopfzeilenfarben lesbar bleibt. */}
        {baustelle.address && (
          <div
            title={baustelle.address}
            style={{
              fontSize: 10,
              fontWeight: 500,
              opacity: 0.8,
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {baustelle.address}
          </div>
        )}
      </div>

      {/* Ressourcen */}
      <div style={{ padding: 8, flex: 1, minHeight: 70 }}>
        {allCards.length === 0 && (
          <div style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center', padding: '16px 0' }}>
            Ziags umme
          </div>
        )}
        {allCards.map((card) => (
          <ResourceCard key={card.id} data={card} />
        ))}
      </div>

      {/* Zählerleiste */}
      <div
        style={{
          borderTop: '1px solid #e5e7eb',
          padding: '3px 8px',
          fontSize: 11,
          color: '#6b7280',
          textAlign: 'center',
        }}
      >
        {personnel.length} Pers. ·{' '}
        {equipment.filter((e) => e.resourceCategory === 'fahrzeug').length} Fzg. ·{' '}
        {equipment.filter((e) => e.resourceCategory === 'maschine').length} Masch.
      </div>

      {/* Notizen – fest sichtbar, wachsen bei Fokus */}
      <div style={{ borderTop: '1px solid #e5e7eb', padding: '6px 8px 4px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            marginBottom: 4,
            fontSize: 10,
            fontWeight: 600,
            color: '#64748b',
          }}
        >
          <span style={{ flex: 1 }}>Notizen</span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 2,
              fontSize: 10,
              color: '#059669',
              fontWeight: 500,
              opacity: savedFeedback ? 1 : 0,
              transition: 'opacity 0.2s',
            }}
          >
            <Check size={10} />
            Gespeichert
          </span>
        </div>
        <textarea
          value={localNotes}
          onChange={(e) => handleNotesChange(e.target.value)}
          onFocus={() => setNotesFocused(true)}
          onBlur={handleBlur}
          placeholder="Was wird gebraucht, was ist mitzunehmen, was steht an …"
          style={{
            width: '100%',
            border: '1px solid ' + (notesFocused ? '#3b82f6' : '#e2e8f0'),
            borderRadius: 6,
            padding: '5px 7px',
            fontSize: 12,
            fontFamily: 'inherit',
            resize: 'vertical',
            outline: 'none',
            lineHeight: 1.45,
            color: '#1e293b',
            backgroundColor: '#fff',
            height: notesFocused ? 110 : 52,
            transition: 'height 0.15s, border-color 0.15s',
            display: 'block',
          }}
        />
      </div>

      {/* Pläne */}
      <BaustelleFiles
        baustelleId={baustelle.id}
        attachments={baustelle.attachments ?? []}
        onChange={handleAttachments}
      />
    </div>
  );
}
