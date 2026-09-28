import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { GripVertical, Archive, ArchiveRestore, Check, X } from 'lucide-react';
import type { Baustelle } from '../types';

/** Namensraum fuer Spalten-Drags – haelt sie von den Ressourcen-IDs getrennt. */
export const COLUMN_DRAG_PREFIX = 'col:';

const headerBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 'none',
  borderRadius: 4,
  background: 'rgba(255,255,255,0.18)',
  color: '#fff',
  cursor: 'pointer',
  padding: 3,
  flexShrink: 0,
};

/**
 * Griff zum Umsortieren + Archivieren, sitzt in der Kopfzeile der Spalte.
 *
 * Der Griff ist ein eigenes Draggable mit der ID `col:<id>` – bewusst KEIN
 * useSortable. Das registriert Draggable und Droppable unter derselben ID und
 * wuerde entweder mit dem vorhandenen useDroppable der Spalte kollidieren oder
 * zwei fast deckungsgleiche Drop-Rechtecke je Spalte erzeugen, zwischen denen
 * closestCenter praktisch zufaellig waehlt. Eine abgelegte Ressourcenkarte
 * landete dann gelegentlich auf der ID `col:bv3` – also auf einer Baustelle,
 * die es nicht gibt. Das vorhandene Droppable der Spalte dient hier einfach
 * zugleich als Sortierziel.
 */
export function ColumnControls({
  baustelle,
  onArchive,
}: {
  baustelle: Baustelle;
  onArchive: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: COLUMN_DRAG_PREFIX + baustelle.id,
    data: { type: 'column', baustelleId: baustelle.id },
  });

  if (confirming) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <span style={{ fontSize: 10, fontWeight: 500, whiteSpace: 'nowrap' }}>Archivieren?</span>
        <button
          title="Ja, archivieren"
          onClick={() => {
            setConfirming(false);
            onArchive(baustelle.id);
          }}
          style={{ ...headerBtn, background: 'rgba(255,255,255,0.35)' }}
        >
          <Check size={12} />
        </button>
        <button title="Abbrechen" onClick={() => setConfirming(false)} style={headerBtn}>
          <X size={12} />
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      <button
        title="Baustelle archivieren"
        onClick={() => setConfirming(true)}
        style={headerBtn}
      >
        <Archive size={12} />
      </button>
      <span
        ref={setNodeRef}
        title="Zum Umsortieren ziehen"
        style={{
          ...headerBtn,
          cursor: isDragging ? 'grabbing' : 'grab',
          touchAction: 'none',
          opacity: isDragging ? 0.5 : 1,
        }}
        {...listeners}
        {...attributes}
      >
        <GripVertical size={12} />
      </span>
    </div>
  );
}

/**
 * Schlanker Schatten beim Spalten-Drag. Bewusst nicht die ganze Spalte –
 * das Overlay wird bei jeder Mausbewegung neu gezeichnet, und eine Spalte
 * mit Textfeld und Dateiliste wuerde dabei ruckeln.
 */
export function ColumnDragPreview({
  baustelle,
  personnelCount,
  equipmentCount,
}: {
  baustelle: Baustelle;
  personnelCount: number;
  equipmentCount: number;
}) {
  return (
    <div
      style={{
        width: 220,
        borderRadius: 10,
        overflow: 'hidden',
        border: '2px solid ' + baustelle.color,
        backgroundColor: '#fff',
        boxShadow: '0 12px 28px rgba(0,0,0,0.3)',
      }}
    >
      <div
        style={{
          backgroundColor: baustelle.color,
          color: '#fff',
          padding: '8px 10px',
          fontWeight: 700,
          fontSize: 14,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {baustelle.name}
      </div>
      <div style={{ padding: '6px 10px', fontSize: 11, color: '#6b7280', textAlign: 'center' }}>
        {personnelCount} Pers. · {equipmentCount} Geräte
      </div>
    </div>
  );
}

/** Aufklappbare Leiste mit den archivierten Baustellen. */
export function ArchivStrip({
  archived,
  onRestore,
}: {
  archived: Baustelle[];
  onRestore: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  if (archived.length === 0) return null;

  return (
    <div style={{ padding: '0 16px 4px' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          border: '1px solid #e2e8f0',
          borderRadius: 7,
          background: '#fff',
          color: '#64748b',
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 600,
          padding: '5px 10px',
        }}
      >
        <Archive size={13} />
        Archiv ({archived.length})
      </button>

      {open && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            marginTop: 6,
          }}
        >
          {archived.map((b) => (
            <div
              key={b.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                border: '1px solid #e2e8f0',
                borderLeft: '4px solid ' + b.color,
                borderRadius: 7,
                backgroundColor: '#fff',
                padding: '4px 6px 4px 8px',
                fontSize: 12,
              }}
            >
              <span
                title={b.name}
                style={{
                  maxWidth: 180,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: '#334155',
                  fontWeight: 500,
                }}
              >
                {b.name}
              </span>
              {(b.attachments?.length ?? 0) > 0 && (
                <span style={{ fontSize: 10, color: '#94a3b8' }}>
                  {b.attachments!.length} Pläne
                </span>
              )}
              <button
                title="Wieder auf die Tafel holen"
                onClick={() => onRestore(b.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  border: '1px solid #cbd5e1',
                  borderRadius: 5,
                  background: 'transparent',
                  color: '#2563eb',
                  cursor: 'pointer',
                  fontSize: 11,
                  padding: '2px 7px',
                }}
              >
                <ArchiveRestore size={11} />
                Zurückholen
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
