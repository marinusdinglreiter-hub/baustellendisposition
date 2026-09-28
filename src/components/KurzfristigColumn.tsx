import { useState, useRef, useEffect } from 'react';
import { Plus, Zap } from 'lucide-react';
import type { Baustelle, Personnel, Equipment } from '../types';
import { generateId, KURZFRISTIG_COLOR } from '../types';
import { KurzfristigKarte } from './KurzfristigKarte';

interface Props {
  baustellen: Baustelle[];
  personnel: Personnel[];
  equipment: Equipment[];
  onCreate: (b: Baustelle) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onConvert: (id: string) => void;
  onDelete: (id: string) => void;
}

/**
 * Feste Spalte fuer spontane Tageseinsaetze, links neben den KFZ-Terminen.
 *
 * Gedacht fuer die Frueh: Name tippen, Leute und Geraete drauf ziehen, fertig.
 * Das Buero macht spaeter mit einem Klick eine richtige Baustelle daraus.
 */
export function KurzfristigColumn({
  baustellen,
  personnel,
  equipment,
  onCreate,
  onUpdateNotes,
  onConvert,
  onDelete,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  // Verhindert, dass das Blur-Uebernehmen und der "+"-Klick sich in die Quere
  // kommen, wenn man bei offenem Feld noch einmal auf "+" drueckt.
  const schliesstGerade = useRef(false);

  // Fokus ueber Ref statt autoFocus – autoFocus ist unzuverlaessig, wenn ein
  // Element in einen bereits montierten Teilbaum eingehaengt wird.
  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  function anlegen(): boolean {
    const name = draft.trim();
    if (!name) return false;
    const heute = new Date().toISOString().split('T')[0];
    onCreate({
      id: generateId(),
      name,
      address: '',
      status: 'Aktiv',
      client: '',
      notes: '',
      startDate: heute,
      endDate: heute,
      color: KURZFRISTIG_COLOR,
      createdAt: heute,
      kurzfristig: true,
      // sortOrder und attachments bewusst weggelassen – normalizeBaustellen
      // haengt die Karte hinten an und setzt attachments auf []
    });
    setDraft('');
    return true;
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Nach dem Anlegen bleibt das Feld offen und behaelt den Fokus – wer in
      // der Frueh drei Einsaetze aufmacht, soll nicht dreimal auf "+" klicken.
      anlegen();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setDraft('');
      setAdding(false);
    }
  }

  function handleBlur() {
    schliesstGerade.current = true;
    anlegen();
    setAdding(false);
    setTimeout(() => {
      schliesstGerade.current = false;
    }, 0);
  }

  return (
    <div
      style={{
        flex: '0 0 210px',
        alignSelf: 'stretch',
        borderRadius: 12,
        border: '2px solid #e5e7eb',
        backgroundColor: '#fff',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          backgroundColor: KURZFRISTIG_COLOR,
          color: '#fff',
          padding: '8px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: 0.3,
        }}
      >
        <Zap size={14} />
        <span style={{ flex: 1 }}>Kurzfristig</span>
        {baustellen.length > 0 && (
          <span
            style={{
              fontSize: 10,
              backgroundColor: 'rgba(255,255,255,0.22)',
              borderRadius: 10,
              padding: '1px 7px',
            }}
          >
            {baustellen.length}
          </span>
        )}
        <button
          title="Kurzfristige Baustelle anlegen"
          onClick={() => {
            if (schliesstGerade.current) return;
            setAdding(true);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            border: 'none',
            borderRadius: 4,
            background: 'rgba(255,255,255,0.22)',
            color: '#fff',
            cursor: 'pointer',
            padding: 3,
            flexShrink: 0,
          }}
        >
          <Plus size={13} />
        </button>
      </div>

      <div style={{ padding: 8, flex: 1, overflowY: 'auto', maxHeight: 520 }}>
        {adding && (
          <input
            ref={inputRef}
            type="text"
            maxLength={60}
            value={draft}
            placeholder="Name, dann Enter"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            style={{
              width: '100%',
              border: '2px solid #3b82f6',
              borderRadius: 6,
              padding: '5px 7px',
              fontSize: 12,
              fontFamily: 'inherit',
              outline: 'none',
              marginBottom: 6,
              color: '#1e293b',
            }}
          />
        )}

        {baustellen.length === 0 && !adding && (
          <div
            style={{
              color: '#9ca3af',
              fontSize: 11,
              textAlign: 'center',
              padding: '16px 4px',
              lineHeight: 1.5,
            }}
          >
            Noch nichts angelegt.
            <br />
            Mit + einen spontanen Einsatz aufmachen.
          </div>
        )}

        {baustellen.map((b) => (
          <KurzfristigKarte
            key={b.id}
            baustelle={b}
            personnel={personnel.filter((p) => p.assignedTo === b.id)}
            equipment={equipment.filter((e) => e.assignedTo === b.id)}
            onUpdateNotes={onUpdateNotes}
            onConvert={onConvert}
            onDelete={onDelete}
          />
        ))}
      </div>

      <div
        style={{
          borderTop: '1px solid #e5e7eb',
          padding: '4px 8px',
          fontSize: 10,
          color: '#94a3b8',
          textAlign: 'center',
        }}
      >
        Nicht in der Verwaltung
      </div>
    </div>
  );
}
