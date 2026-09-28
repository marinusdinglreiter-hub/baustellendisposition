import { useEffect, useState } from 'react';
import { X, ExternalLink, FileWarning } from 'lucide-react';
import type { BaustelleAttachment } from '../types';
import { fileStore, formatBytes } from '../utils/fileStore';

/**
 * Zeigt einen Plan als Overlay statt in einem neuen Tab: am Hallenmonitor
 * laesst sich ein verirrter Browser-Tab praktisch nicht mehr schliessen.
 *
 * Die Object-URL entsteht ausschliesslich beim Oeffnen und wird im Cleanup
 * wieder freigegeben – damit sind Lecks strukturell ausgeschlossen. Nie eine
 * URL beim Rendern der Liste erzeugen.
 */
export function PdfViewerModal({
  attachment,
  onClose,
}: {
  attachment: BaustelleAttachment;
  onClose: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let made: string | null = null;

    fileStore
      .getBlob(attachment.id)
      .then((blob) => {
        if (cancelled) return;
        if (!blob) {
          setError('Diese Datei liegt nicht auf diesem Gerät.');
          return;
        }
        made = URL.createObjectURL(blob);
        setUrl(made);
      })
      .catch(() => {
        if (!cancelled) setError('Datei konnte nicht geladen werden.');
      });

    return () => {
      cancelled = true;
      if (made) URL.revokeObjectURL(made);
    };
  }, [attachment.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  /**
   * Der neue Tab braucht eine eigene URL: die des Overlays wird beim
   * Schliessen freigegeben und wuerde das Dokument dort mitreissen.
   */
  async function openInNewTab() {
    const blob = await fileStore.getBlob(attachment.id);
    if (!blob) return;
    const u = URL.createObjectURL(blob);
    window.open(u, '_blank');
    setTimeout(() => URL.revokeObjectURL(u), 60_000);
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15,23,42,0.75)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#fff',
          borderRadius: 12,
          width: 'min(1100px, 100%)',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
        }}
      >
        <div
          style={{
            backgroundColor: '#1e293b',
            color: '#fff',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              flex: 1,
              fontSize: 14,
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {attachment.name}
          </span>
          <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>
            {formatBytes(attachment.size)}
          </span>
          <button
            onClick={openInNewTab}
            disabled={!url}
            title="In neuem Tab öffnen"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '5px 10px',
              border: '1px solid #475569',
              borderRadius: 6,
              backgroundColor: 'transparent',
              color: url ? '#94a3b8' : '#475569',
              cursor: url ? 'pointer' : 'default',
              fontSize: 12,
              flexShrink: 0,
            }}
          >
            <ExternalLink size={12} />
            Neuer Tab
          </button>
          <button
            onClick={onClose}
            title="Schließen (Esc)"
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: 6,
              border: 'none',
              borderRadius: 6,
              backgroundColor: 'rgba(255,255,255,0.12)',
              color: '#fff',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 0, backgroundColor: '#f1f5f9' }}>
          {error && (
            <div
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                color: '#64748b',
                fontSize: 14,
                padding: 24,
                textAlign: 'center',
              }}
            >
              <FileWarning size={32} />
              {error}
              <span style={{ fontSize: 12, maxWidth: 420, lineHeight: 1.5 }}>
                Pläne liegen nur auf dem Gerät, auf dem sie abgelegt wurden.
                Über die Cloud-Sync-Datei wandert nur der Eintrag mit, nicht die
                Datei selbst.
              </span>
            </div>
          )}
          {!error && url && (
            <iframe
              src={url}
              title={attachment.name}
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          )}
          {!error && !url && (
            <div
              style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8',
                fontSize: 13,
              }}
            >
              Wird geladen …
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
