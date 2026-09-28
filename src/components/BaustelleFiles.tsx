import { useCallback, useEffect, useRef, useState } from 'react';
import { FileText, Upload, X, CloudOff, ChevronDown } from 'lucide-react';
import type { BaustelleAttachment } from '../types';
import { MAX_ATTACHMENT_BYTES } from '../types';
import { fileStore, formatBytes } from '../utils/fileStore';
import { showToast } from './Toast';
import { PdfViewerModal } from './PdfViewerModal';

const VISIBLE_ROWS = 3;

/**
 * Dateibereich unter den Notizen einer Baustelle.
 *
 * Der native Datei-Drop (dragenter/dragover/drop mit DataTransfer) und
 * @dnd-kit sind zwei voellig getrennte Ereignisstroeme – der PointerSensor
 * haengt nur an Elementen mit seinen listeners und hoert nie auf drop.
 * Sie kommen sich also nicht in die Quere. Entscheidend ist nur:
 * ohne preventDefault auf dragover feuert `drop` ueberhaupt nie.
 */
export function BaustelleFiles({
  baustelleId,
  attachments,
  onChange,
  compact = false,
}: {
  baustelleId: string;
  attachments: BaustelleAttachment[];
  onChange: (next: BaustelleAttachment[]) => void;
  compact?: boolean;
}) {
  const [dragActive, setDragActive] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [viewing, setViewing] = useState<BaustelleAttachment | null>(null);
  const [localIds, setLocalIds] = useState<Set<string> | null>(null);
  /** null = wird noch geprueft */
  const [ablageDa, setAblageDa] = useState<boolean | null>(null);
  // Ein blosses dragleave feuert auch beim Uebertritt in ein Kindelement –
  // ohne Zaehler flackert die Hervorhebung.
  const dragCounter = useRef(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Laesst sich auf diesem Geraet ueberhaupt etwas ablegen?
  useEffect(() => {
    let cancelled = false;
    fileStore
      .available()
      .then((ok) => {
        if (!cancelled) setAblageDa(ok);
      })
      .catch(() => {
        if (!cancelled) setAblageDa(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Welche Dateien liegen tatsaechlich auf DIESEM Geraet?
  useEffect(() => {
    let cancelled = false;
    // Auch bei leerer Liste ueber Promise.all – das loest im Microtask auf,
    // setState laeuft also nie synchron im Effekt-Rumpf.
    Promise.all(attachments.map((a) => fileStore.has(a.id).then((ok) => [a.id, ok] as const)))
      .then((pairs) => {
        if (cancelled) return;
        setLocalIds(new Set(pairs.filter(([, ok]) => ok).map(([id]) => id)));
      })
      .catch(() => {
        if (!cancelled) setLocalIds(new Set());
      });
    return () => {
      cancelled = true;
    };
  }, [attachments]);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const added: BaustelleAttachment[] = [];

      for (const file of Array.from(files)) {
        const isPdf =
          file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        if (!isPdf) {
          showToast(file.name + ' ist kein PDF und wurde nicht übernommen.', 'error');
          continue;
        }
        if (file.size > MAX_ATTACHMENT_BYTES) {
          showToast(
            file.name +
              ' ist ' +
              formatBytes(file.size) +
              ' groß – erlaubt sind ' +
              formatBytes(MAX_ATTACHMENT_BYTES) +
              '.',
            'error'
          );
          continue;
        }
        try {
          added.push(await fileStore.put(baustelleId, file));
        } catch (e) {
          const name = (e as { name?: string })?.name;
          showToast(
            name === 'QuotaExceededError'
              ? 'Gerätespeicher voll – bitte alte Pläne löschen.'
              : file.name + ' konnte nicht gespeichert werden.',
            'error'
          );
        }
      }

      if (added.length > 0) {
        onChange([...attachments, ...added]);
        showToast(
          added.length === 1 ? 'Plan abgelegt.' : added.length + ' Pläne abgelegt.',
          'success'
        );
      }
    },
    [attachments, baustelleId, onChange]
  );

  async function handleRemove(a: BaustelleAttachment) {
    if (!window.confirm(a.name + ' wirklich löschen?')) return;
    // Blob zuerst: ein uebriger Blob ist von der Muellabfuhr einsammelbar,
    // uebrige Metadaten waeren dagegen eine dauerhaft kaputte Zeile.
    try {
      await fileStore.remove(a.id);
    } catch {
      // trotzdem aus der Liste nehmen
    }
    onChange(attachments.filter((x) => x.id !== a.id));
  }

  const hasFiles = (e: React.DragEvent) =>
    ablageDa !== false && !!e.dataTransfer?.types?.includes('Files');

  const shown = expanded ? attachments : attachments.slice(0, VISIBLE_ROWS);
  const hidden = attachments.length - shown.length;

  return (
    <div
      onDragEnter={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        dragCounter.current++;
        setDragActive(true);
      }}
      onDragOver={(e) => {
        if (!hasFiles(e)) return;
        // Ohne preventDefault auf dragover feuert drop nie.
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }}
      onDragLeave={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        dragCounter.current = Math.max(0, dragCounter.current - 1);
        if (dragCounter.current === 0) setDragActive(false);
      }}
      onDrop={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        dragCounter.current = 0;
        setDragActive(false);
        void handleFiles(e.dataTransfer.files);
      }}
      style={{
        borderTop: '1px solid #e5e7eb',
        padding: compact ? '5px 8px 6px' : '6px 8px 8px',
        backgroundColor: dragActive ? '#e0f2fe' : undefined,
        transition: 'background-color 0.15s',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          marginBottom: attachments.length ? 5 : 0,
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 600, color: '#64748b', flex: 1 }}>
          Pläne {attachments.length > 0 && '(' + attachments.length + ')'}
        </span>
        {ablageDa !== false && (
        <button
          onClick={() => inputRef.current?.click()}
          title="PDF auswählen – oder einfach hierher ziehen"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            border: '1px dashed #cbd5e1',
            borderRadius: 5,
            background: 'transparent',
            color: '#64748b',
            cursor: 'pointer',
            fontSize: 10,
            padding: '2px 6px',
          }}
        >
          <Upload size={10} />
          PDF
        </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          multiple
          hidden
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {ablageDa === false && (
        <div
          title="Diese Fassung läuft ohne lokalen Webserver. Chrome sperrt dabei die Browser-Datenbank."
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 4,
            fontSize: 10,
            color: '#b45309',
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 5,
            padding: '4px 6px',
            lineHeight: 1.4,
          }}
        >
          <CloudOff size={11} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            In dieser Fassung lassen sich keine Pläne ablegen. Dafür braucht es
            das vollständige Paket mit Starter.
          </span>
        </div>
      )}

      {ablageDa !== false && attachments.length === 0 && (
        <div style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center', padding: '3px 0' }}>
          {dragActive ? 'Loslassen zum Ablegen' : 'PDF hierher ziehen'}
        </div>
      )}

      {shown.map((a) => {
        const isLocal = localIds === null ? true : localIds.has(a.id);
        return (
          <div
            key={a.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 5px',
              borderRadius: 5,
              marginBottom: 2,
              backgroundColor: isLocal ? '#f8fafc' : '#f1f5f9',
              opacity: isLocal ? 1 : 0.6,
            }}
          >
            {isLocal ? (
              <FileText size={11} style={{ color: '#dc2626', flexShrink: 0 }} />
            ) : (
              <CloudOff size={11} style={{ color: '#94a3b8', flexShrink: 0 }} />
            )}
            <button
              onClick={() => isLocal && setViewing(a)}
              disabled={!isLocal}
              title={isLocal ? a.name : a.name + ' – nicht auf diesem Gerät'}
              style={{
                flex: 1,
                minWidth: 0,
                textAlign: 'left',
                border: 'none',
                background: 'transparent',
                padding: 0,
                fontSize: 11,
                color: isLocal ? '#334155' : '#94a3b8',
                cursor: isLocal ? 'pointer' : 'default',
                textDecoration: isLocal ? 'underline' : 'none',
                textDecorationColor: '#cbd5e1',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {a.name}
            </button>
            <button
              onClick={() => void handleRemove(a)}
              title="Plan löschen"
              style={{
                display: 'flex',
                border: 'none',
                background: 'transparent',
                color: '#cbd5e1',
                cursor: 'pointer',
                padding: 1,
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#dc2626';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#cbd5e1';
              }}
            >
              <X size={11} />
            </button>
          </div>
        );
      })}

      {hidden > 0 && (
        <button
          onClick={() => setExpanded(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            border: 'none',
            background: 'transparent',
            color: '#64748b',
            cursor: 'pointer',
            fontSize: 10,
            padding: '2px 5px',
          }}
        >
          <ChevronDown size={10} />
          {hidden} weitere
        </button>
      )}

      {viewing && <PdfViewerModal attachment={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
