import { useState, useRef, useEffect, useCallback } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { ArrowRightToLine, Trash2, Check, X } from 'lucide-react';
import type { Baustelle, Personnel, Equipment } from '../types';
import { ResourceCard } from './ResourceCard';
import type { CardData } from './ResourceCard';
import { buildCards } from './cardData';

interface Props {
  baustelle: Baustelle;
  personnel: Personnel[];
  equipment: Equipment[];
  onUpdateNotes: (id: string, notes: string) => void;
  onConvert: (id: string) => void;
  onDelete: (id: string) => void;
}

const fussBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 3,
  border: '1px solid #e2e8f0',
  borderRadius: 5,
  background: '#fff',
  cursor: 'pointer',
  fontSize: 10,
  padding: '3px 6px',
};

/**
 * Eine kurzfristige Baustelle: Name, Ressourcen zum Hineinziehen, eine Zeile
 * Notiz. Bewusst schlanker als eine BaustelleColumn – es sollen drei bis vier
 * uebereinander in die Spalte passen.
 *
 * Kein Sortiergriff (die Reihenfolge ergibt sich aus der Anlage), kein
 * Archivieren (unarchiveBaustelle wuerde die Karte als kurzfristige
 * zurueckholen) und keine Plan-Ablage.
 */
export function KurzfristigKarte({
  baustelle,
  personnel,
  equipment,
  onUpdateNotes,
  onConvert,
  onDelete,
}: Props) {
  const [confirming, setConfirming] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    };
  }, []);

  const saveNotes = useCallback(
    (value: string) => {
      if (value !== baustelle.notes) onUpdateNotes(baustelle.id, value);
    },
    [onUpdateNotes, baustelle.id, baustelle.notes]
  );

  function handleNotesChange(value: string) {
    setLocalNotes(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveNotes(value), 500);
  }

  function handleBlur() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    saveNotes(localNotes);
  }

  const { isOver, active, setNodeRef } = useDroppable({
    id: baustelle.id,
    data: { type: 'baustelle', baustelle },
  });

  // Waehrend ein Spalten-Drag laeuft nicht aufleuchten: ein Drop hier tut
  // bewusst nichts (siehe die Absicherung in DispositionBoard), also darf die
  // Karte auch nicht so tun, als koenne man etwas ablegen.
  const istSpaltenDrag = active?.data.current?.type === 'column';
  const isValidHover = isOver && !istSpaltenDrag;

  const allCards: CardData[] = buildCards(personnel, equipment);

  return (
    <div
      ref={setNodeRef}
      style={{
        borderRadius: 9,
        overflow: 'hidden',
        marginBottom: 6,
        backgroundColor: isValidHover ? '#e0f2fe' : '#fff',
        border: isValidHover ? '2px solid #0284c7' : '2px solid #e5e7eb',
        transition: 'border-color 0.15s, background-color 0.15s',
      }}
    >
      {/* Kopf */}
      <div
        style={{
          backgroundColor: baustelle.color,
          color: '#fff',
          padding: '5px 8px',
          fontSize: 13,
          fontWeight: 700,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        title={baustelle.name}
      >
        {baustelle.name}
      </div>

      {/* Ressourcen */}
      <div style={{ padding: 6, minHeight: 54 }}>
        {allCards.length === 0 && (
          <div style={{ color: '#9ca3af', fontSize: 11, textAlign: 'center', padding: '12px 0' }}>
            Ziags umme
          </div>
        )}
        {allCards.map((card) => (
          <ResourceCard key={card.id} data={card} />
        ))}
      </div>

      {/* Notiz */}
      <div style={{ padding: '0 6px 6px' }}>
        <input
          type="text"
          value={localNotes}
          onChange={(e) => handleNotesChange(e.target.value)}
          onBlur={handleBlur}
          placeholder="Notiz"
          style={{
            width: '100%',
            border: '1px solid #e2e8f0',
            borderRadius: 5,
            padding: '4px 6px',
            fontSize: 11,
            fontFamily: 'inherit',
            outline: 'none',
            color: '#1e293b',
            backgroundColor: '#fff',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#3b82f6';
          }}
          onBlurCapture={(e) => {
            (e.target as HTMLInputElement).style.borderColor = '#e2e8f0';
          }}
        />
      </div>

      {/* Fusszeile */}
      <div
        style={{
          borderTop: '1px solid #e5e7eb',
          padding: '4px 6px',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          backgroundColor: '#f8fafc',
        }}
      >
        {confirming ? (
          <>
            <span style={{ flex: 1, fontSize: 10, color: '#b91c1c', fontWeight: 600 }}>
              Löschen?
            </span>
            <button
              title="Ja, löschen"
              onClick={() => {
                setConfirming(false);
                onDelete(baustelle.id);
              }}
              style={{ ...fussBtn, borderColor: '#fca5a5', color: '#b91c1c' }}
            >
              <Check size={11} />
            </button>
            <button title="Abbrechen" onClick={() => setConfirming(false)} style={fussBtn}>
              <X size={11} />
            </button>
          </>
        ) : (
          <>
            <button
              title="Zur richtigen Baustelle machen – wandert in die Baustellenreihe, Ressourcen bleiben dran"
              onClick={() => onConvert(baustelle.id)}
              style={{ ...fussBtn, flex: 1, color: '#2563eb', borderColor: '#bfdbfe' }}
            >
              <ArrowRightToLine size={11} />
              Zur Baustelle
            </button>
            <button
              title="Kurzfristige Baustelle löschen"
              onClick={() => setConfirming(true)}
              style={{ ...fussBtn, color: '#94a3b8' }}
            >
              <Trash2 size={11} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
