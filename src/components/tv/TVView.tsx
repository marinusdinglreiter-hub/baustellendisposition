import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore, STORAGE_KEY } from '../../store/useStore';
import { useTVSettingsListener } from '../../hooks/useTVSettings';
import { useClock } from '../../hooks/useClock';
import { TVBaustelleBlock } from './TVBaustelleBlock';
import type { Baustelle, Personnel, Equipment } from '../../types';
import { TV_BROADCAST_CHANNEL } from '../../types/tvSettings';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getBaustelleSig(
  b: Baustelle,
  personnel: Personnel[],
  equipment: Equipment[]
): string {
  return JSON.stringify({
    name: b.name, address: b.address, status: b.status, notes: b.notes,
    f: (b.attachments ?? []).map((a) => a.id).sort(),
    p: personnel.filter((p) => p.assignedTo === b.id).map((p) => p.id).sort(),
    e: equipment.filter((e) => e.assignedTo === b.id).map((e) => e.id).sort(),
  });
}

function getGridColumns(count: number): number {
  if (count <= 2) return count === 1 ? 1 : 2;
  if (count <= 4) return 2;
  return 3;
}

const TEXT_COLORS: Record<string, string> = {
  weiss: '#f8fafc',
  hellgrau: '#94a3b8',
};

const BG_COLORS: Record<string, string> = {
  schwarz: '#000000',
  dunkelgrau: '#111827',
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function TVView() {
  const { baustellen, personnel, equipment } = useStore();
  const settings = useTVSettingsListener();
  const { datetime } = useClock();

  const [currentPage, setCurrentPage] = useState(0);
  const [flashingIds, setFlashingIds] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);

  const prevSigsRef = useRef<Record<string, string>>({});
  const lastHeartbeatRef = useRef<number>(0);

  // ── Live-Aktualisierung: auf Schreibzugriffe des Dispo-Tabs reagieren ────
  // `storage` feuert nie im schreibenden Tab – nur die Hallenansicht reagiert.
  // Ohne das hier zeigt der Hallenmonitor den Stand vom letzten Seiten-Reload.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) useStore.persist.rehydrate();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // ── BroadcastChannel: Heartbeat für Verbindungsstatus ────────────────────
  useEffect(() => {
    const ch = new BroadcastChannel(TV_BROADCAST_CHANNEL);
    ch.onmessage = (e: MessageEvent) => {
      if (e.data?.type === 'HEARTBEAT') {
        lastHeartbeatRef.current = Date.now();
        setIsConnected(true);
      }
    };
    const checker = setInterval(() => {
      setIsConnected(Date.now() - lastHeartbeatRef.current < 12_000);
    }, 6_000);
    return () => { ch.close(); clearInterval(checker); };
  }, []);

  // ── Flash-Erkennung: Signaturen vergleichen ───────────────────────────────
  useEffect(() => {
    const changed = new Set<string>();
    const newSigs: Record<string, string> = {};

    for (const b of baustellen) {
      const sig = getBaustelleSig(b, personnel, equipment);
      newSigs[b.id] = sig;
      if (prevSigsRef.current[b.id] && prevSigsRef.current[b.id] !== sig) {
        changed.add(b.id);
      }
    }
    prevSigsRef.current = newSigs;

    if (changed.size > 0 && settings.live.visuellosFeedback) {
      setFlashingIds(changed);
      const t = setTimeout(() => setFlashingIds(new Set()), 2600);
      return () => clearTimeout(t);
    }
  }, [baustellen, personnel, equipment, settings.live.visuellosFeedback]);

  // ── Baustellen filtern ────────────────────────────────────────────────────
  const visibleBaustellen = baustellen.filter((b) => {
    if (b.status === 'Archiviert') return false;
    if (!settings.anzeige.leereBaustellen) {
      const hasPerson = personnel.some((p) => p.assignedTo === b.id);
      const hasEquip  = equipment.some((e) => e.assignedTo === b.id);
      if (!hasPerson && !hasEquip) return false;
    }
    return true;
  });

  // ── Pagination ────────────────────────────────────────────────────────────
  const BLOCKS_PER_PAGE = 6;
  const totalPages = Math.max(1, Math.ceil(visibleBaustellen.length / BLOCKS_PER_PAGE));
  const safePage   = Math.min(currentPage, totalPages - 1);
  const pageBlocks = visibleBaustellen.slice(safePage * BLOCKS_PER_PAGE, (safePage + 1) * BLOCKS_PER_PAGE);

  const goNext = useCallback(() => {
    if (settings.blaettern.fadeUebergang) {
      setPageVisible(false);
      setTimeout(() => { setCurrentPage((p) => (p + 1) % totalPages); setPageVisible(true); }, 380);
    } else {
      setCurrentPage((p) => (p + 1) % totalPages);
    }
  }, [settings.blaettern.fadeUebergang, totalPages]);

  useEffect(() => {
    if (!settings.blaettern.aktiv || totalPages <= 1) return;
    const id = setInterval(goNext, settings.blaettern.intervallSekunden * 1000);
    return () => clearInterval(id);
  }, [settings.blaettern.aktiv, settings.blaettern.intervallSekunden, totalPages, goNext]);

  // ── Fullscreen ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (settings.sonstiges.vollbildAuto) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  }, [settings.sonstiges.vollbildAuto]);

  // ── Cursor ────────────────────────────────────────────────────────────────
  useEffect(() => {
    document.body.style.cursor = settings.sonstiges.cursorVerstecken ? 'none' : 'auto';
    return () => { document.body.style.cursor = 'auto'; };
  }, [settings.sonstiges.cursorVerstecken]);

  // ── Abgeleitete Werte ─────────────────────────────────────────────────────
  const bgColor   = BG_COLORS[settings.darstellung.hintergrund] ?? '#111827';
  const textColor = TEXT_COLORS[settings.darstellung.schriftfarbe] ?? '#f8fafc';
  const scale     = settings.darstellung.schriftgroesse / 100;
  const cols      = getGridColumns(pageBlocks.length);

  return (
    <div
      style={{
        background: bgColor,
        color: textColor,
        height: '100dvh',
        width: '100vw',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        padding: '22px 32px 18px',
        boxSizing: 'border-box',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        userSelect: 'none',
        WebkitFontSmoothing: 'antialiased',
      } as React.CSSProperties}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 18,
          flexShrink: 0,
          borderBottom: settings.darstellung.trennlinien
            ? '1px solid rgba(255,255,255,0.1)'
            : 'none',
          paddingBottom: settings.darstellung.trennlinien ? 16 : 0,
        }}
      >
        {/* Links: Titel */}
        <div
          style={{
            fontSize: scale * 1.5 + 'rem',
            fontWeight: 300,
            letterSpacing: 3,
            textTransform: 'uppercase',
            opacity: 0.9,
          }}
        >
          Disposition
        </div>

        {/* Rechts: Zurück-Button + Uhrzeit + Verbindungsdot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* Zurück zur Dispositionsansicht */}
          <button
            onClick={() => {
              document.exitFullscreen?.().catch(() => {});
              // Raute abstreifen statt auf die Wurzel springen – sonst
              // landet man in einem Unterordner-Paket im Leeren.
              // replaceState aendert die Adresse ohne eigene Navigation.
              // Das Neuladen muss danach in einem EIGENEN Task laufen – im
              // selben Task laedt Chrome sonst noch die Adresse mit Raute
              // und man landet wieder in der Hallenansicht.
              const base = window.location.href.split('#')[0];
              if (window.location.hash) {
                window.history.replaceState(null, '', base);
                setTimeout(() => window.location.reload(), 0);
              } else {
                window.location.href = window.location.origin + '/';
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              border: `1px solid ${TEXT_COLORS[settings.darstellung.schriftfarbe] ?? '#f8fafc'}33`,
              borderRadius: 7,
              background: 'rgba(255,255,255,0.06)',
              color: TEXT_COLORS[settings.darstellung.schriftfarbe] ?? '#f8fafc',
              cursor: 'pointer',
              fontSize: scale * 0.8 + 'rem',
              fontFamily: 'inherit',
              letterSpacing: 0.3,
              opacity: 0.55,
              transition: 'opacity 0.2s, background 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = '1';
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = '0.55';
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
            }}
          >
            {/* Pfeil-SVG */}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Dispositionsansicht
          </button>

          {(settings.anzeige.datum || settings.anzeige.uhrzeit) && (
            <div
              style={{
                fontSize: scale * 1.15 + 'rem',
                fontWeight: 400,
                letterSpacing: 0.5,
                opacity: 0.75,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {settings.anzeige.datum && settings.anzeige.uhrzeit
                ? datetime
                : settings.anzeige.datum
                ? datetime.split(' – ')[0]
                : datetime.split(' – ')[1]}
            </div>
          )}

          {/* Verbindungsstatus – nur ein farbiger Punkt, kein Text */}
          {settings.live.verbindungsdot && (
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: isConnected ? '#4ade80' : '#ef4444',
                boxShadow: isConnected
                  ? '0 0 6px rgba(74,222,128,0.7)'
                  : '0 0 6px rgba(239,68,68,0.7)',
                flexShrink: 0,
                animation: isConnected ? 'none' : 'pulse 1.4s ease-in-out infinite',
              }}
            />
          )}
        </div>
      </div>

      {/* ── Baustellen-Grid ────────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridAutoRows: '1fr',
          gap: 14,
          minHeight: 0,
          opacity: pageVisible ? 1 : 0,
          transition: settings.blaettern.fadeUebergang ? 'opacity 0.35s ease' : 'none',
        }}
      >
        {pageBlocks.map((b) => (
          <TVBaustelleBlock
            key={b.id}
            baustelle={b}
            personnel={personnel.filter((p) => p.assignedTo === b.id)}
            equipment={equipment.filter((e) => e.assignedTo === b.id)}
            isFlashing={flashingIds.has(b.id)}
            settings={settings}
            scale={scale}
          />
        ))}

        {pageBlocks.length === 0 && (
          <div
            style={{
              gridColumn: '1 / -1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.2,
              fontSize: scale * 1.4 + 'rem',
              letterSpacing: 1,
            }}
          >
            Keine aktiven Baustellen
          </div>
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      {settings.blaettern.seitenanzahl && totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            marginTop: 14,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontSize: scale * 0.8 + 'rem',
              opacity: 0.3,
              letterSpacing: 0.5,
            }}
          >
            Seite {safePage + 1} / {totalPages}
          </div>
        </div>
      )}
    </div>
  );
}
