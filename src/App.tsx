import { useState, useEffect, useRef } from 'react';
import { useStore } from './store/useStore';
import { DispositionBoard } from './components/DispositionBoard';
import { AdminView } from './components/admin/AdminView';
import { ToastContainer } from './components/Toast';
import { TVSettingsModal } from './components/tv/TVSettingsModal';
import { useTVSettings } from './hooks/useTVSettings';
import { RotateCcw, LayoutDashboard, Settings, FileDown, Monitor, Settings2, Cloud, CloudOff, Lock, TriangleAlert } from 'lucide-react';
import logoUrl from './assets/logo.svg';

/**
 * Das Gruen aus dem Firmenlogo, direkt aus der Bilddatei gemessen.
 * Es traegt die ganze Kopfzeile, damit die Farbsprache eindeutig bleibt.
 */
const MARKE = '#0D783F';
const MARKE_HELL = '#E8F3EC';
import { exportDispositionPDF } from './utils/exportPDF';
import { TV_BROADCAST_CHANNEL } from './types/tvSettings';
import { needsDailySnapshot, takeSnapshot, getTodayString, listSnapshots, loadSnapshot, saveResetUndo } from './utils/snapshotManager';
import { useAdminLock } from './utils/adminLock';
import { PinModal } from './components/PinModal';
import { ResetUndoBanner } from './components/ResetUndoBanner';
import { istSpeicherVerfuegbar, laeuftAlsDatei } from './utils/speicher';
import { gcOrphanFiles } from './utils/fileStoreIdb';
import { getSavedHandle, ensurePermission, writeSyncFile } from './utils/cloudSync';
import type { SnapshotData } from './types';
import { isStreifenBaustelle } from './types';

function App() {
  const { baustellen, personnel, equipment, aboBaustellen, aboCreatedMarkers, currentView, setView, resetData } = useStore();
  const { settings, updateSection, resetSettings } = useTVSettings();
  const [showTVSettings, setShowTVSettings] = useState(false);
  const { unlocked, unlock, lock } = useAdminLock();
  /** Was nach erfolgreicher PIN-Eingabe passieren soll */
  const [pinIntent, setPinIntent] = useState<'verwaltung' | 'reset' | null>(null);

  // Letztes Snapshot-Datum für den Header-Indikator
  const [lastSnapshot, setLastSnapshot] = useState<string | null>(
    () => localStorage.getItem('bsd-snap-last-date')
  );

  // Cloud-Sync-Status für den Header-Indikator
  const [cloudConnected, setCloudConnected] = useState(false);

  // Kurzfristige Einsaetze zaehlen hier bewusst nicht mit – sonst flackert
  // die Projektzahl den ganzen Vormittag, waehrend der Hof Karten anlegt.
  const activeBaustellen = baustellen.filter(isStreifenBaustelle);

  // ── Tages-Snapshot beim App-Start ────────────────────────────────────────
  useEffect(() => {
    if (!needsDailySnapshot()) return;
    const snapData: SnapshotData = { baustellen, personnel, equipment, aboBaustellen, aboCreatedMarkers };
    takeSnapshot(snapData);
    setLastSnapshot(getTodayString());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Datei-Drop: Fehlwürfe abfangen ───────────────────────────────────────
  // Ohne das navigiert ein daneben abgelegtes PDF die ganze Anwendung nach
  // file:///.../plan.pdf und reisst alles Ungespeicherte mit.
  // Bubble-Phase und nur preventDefault – die Drop-Zone selbst laeuft vorher
  // und bleibt unberuehrt.
  useEffect(() => {
    const stop = (e: DragEvent) => e.preventDefault();
    window.addEventListener('dragover', stop);
    window.addEventListener('drop', stop);
    return () => {
      window.removeEventListener('dragover', stop);
      window.removeEventListener('drop', stop);
    };
  }, []);

  // ── Verwaiste Plan-Dateien einsammeln, einmal pro Sitzung ────────────────
  // Referenzmenge sind ALLE Baustellen (auch archivierte – die behalten ihre
  // Plaene) plus alles, was in den lokalen Snapshots steckt. Zusammen mit der
  // Schonfrist im gcOrphanFiles ueberlebt auch ein Reset-Undo seine Dateien.
  useEffect(() => {
    const referenced = new Set<string>();
    for (const b of useStore.getState().baustellen) {
      for (const a of b.attachments ?? []) referenced.add(a.id);
    }
    try {
      for (const meta of listSnapshots()) {
        const snap = loadSnapshot(meta.date);
        for (const b of snap?.data?.baustellen ?? []) {
          for (const a of b.attachments ?? []) referenced.add(a.id);
        }
      }
    } catch {
      // Ein unlesbarer Snapshot darf die Muellabfuhr nicht stoppen –
      // im Zweifel wird dann eben nichts geloescht.
    }
    void gcOrphanFiles(referenced);
  }, []);

  // ── Cloud-Sync: Status beim Start prüfen + Auto-Save bei Änderungen ──────
  useEffect(() => {
    // Header-Indikator: prüfen ob schon verbunden
    getSavedHandle().then(async (h) => {
      if (!h) return;
      const perm = await h.queryPermission({ mode: 'readwrite' });
      setCloudConnected(perm === 'granted');
    }).catch(() => {});
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const unsub = useStore.subscribe(async (state, prevState) => {
      // Nur bei echten Datenänderungen – nicht bei Navigation
      if (
        state.baustellen        === prevState.baustellen &&
        state.personnel         === prevState.personnel  &&
        state.equipment         === prevState.equipment  &&
        state.aboBaustellen     === prevState.aboBaustellen &&
        state.aboCreatedMarkers === prevState.aboCreatedMarkers
      ) return;

      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        try {
          const h = await getSavedHandle();
          if (!h) return;
          const ok = await ensurePermission(h);
          if (!ok) { setCloudConnected(false); return; }
          await writeSyncFile(h, {
            baustellen:        state.baustellen,
            personnel:         state.personnel,
            equipment:         state.equipment,
            aboBaustellen:     state.aboBaustellen,
            aboCreatedMarkers: state.aboCreatedMarkers,
          });
          setCloudConnected(true);
        } catch (e) {
          console.warn('[CloudSync] Auto-save failed', e);
        }
      }, 3000); // 3 Sekunden Debounce
    });

    return () => {
      if (timer) clearTimeout(timer);
      unsub();
    };
  }, []);

  // ── BroadcastChannel heartbeat: keep TV tab's connection dot green ────────
  const channelRef = useRef<BroadcastChannel | null>(null);
  useEffect(() => {
    channelRef.current = new BroadcastChannel(TV_BROADCAST_CHANNEL);

    const heartbeat = () => {
      channelRef.current?.postMessage({ type: 'HEARTBEAT', timestamp: Date.now() });
    };

    heartbeat(); // immediate
    const id = setInterval(heartbeat, 5_000);
    return () => {
      clearInterval(id);
      channelRef.current?.close();
    };
  }, []);

  function handleVerwaltungClick() {
    // Bei gesperrtem Geraet wird nicht erst umgeschaltet und dann gesperrt –
    // die PIN kommt vorher, sonst blitzt eine leere Ansicht auf.
    if (unlocked) {
      setView('verwaltung');
      return;
    }
    setPinIntent('verwaltung');
  }

  function handleLock() {
    lock();
    setView('disposition');
  }

  /** Reset: PIN nur wenn gesperrt, Rueckfrage aber immer. */
  function handleResetClick() {
    if (!unlocked) {
      setPinIntent('reset');
      return;
    }
    performReset();
  }

  function performReset() {
    const ok = window.confirm(
      `Wirklich zurücksetzen?

${baustellen.length} Baustellen, ${personnel.length} Personal und ${equipment.length} Geräte werden auf den Auslieferungszustand gesetzt.

Der jetzige Stand lässt sich danach 24 Stunden lang über den Hinweis unter der Kopfzeile zurückholen.`
    );
    if (!ok) return;
    // Erst sichern, dann zuruecksetzen – die Reihenfolge ist entscheidend
    saveResetUndo({ baustellen, personnel, equipment, aboBaustellen, aboCreatedMarkers });
    resetData();
  }

  function handlePinSuccess() {
    const intent = pinIntent;
    unlock();
    setPinIntent(null);
    if (intent === 'verwaltung') setView('verwaltung');
    else if (intent === 'reset') performReset();
  }

  function openTV() {
    // Raute statt Pfad: funktioniert auch dort, wo kein Server unbekannte
    // Adressen auf index.html zurueckfallen laesst.
    const base = window.location.href.split('#')[0];
    window.open(base + '#tv', '_blank');
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f1f5f9',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Header */}
      {/* Kopfzeile: weiss, weil das Logo einen weissen Hintergrund
          eingebrannt hat - auf dunklem Grund saesse es in einem Kasten.
          Das Markengruen traegt stattdessen Rand, aktiven Reiter und
          Akzente. */}
      <header
        style={{
          backgroundColor: '#fff',
          color: '#334155',
          padding: '8px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          position: 'sticky',
          top: 0,
          zIndex: 100,
          borderBottom: '3px solid ' + MARKE,
          boxShadow: '0 2px 8px rgba(15,23,42,0.08)',
        }}
      >
        {/* Reiter nach links, damit das Logo wirklich mittig sitzt. Beide
            Aussengruppen flex 1 mit Basis 0: sie teilen sich den Platz
            gleichmaessig, das Logo bleibt dadurch zentriert. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: '1 1 0', minWidth: 0, overflow: 'hidden' }}>
          <button
            onClick={() => setView('disposition')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', border: 'none', borderRadius: 6,
              backgroundColor: currentView === 'disposition' ? MARKE : 'transparent',
              color: currentView === 'disposition' ? '#fff' : '#64748b',
              cursor: 'pointer', fontSize: 14,
              fontWeight: currentView === 'disposition' ? 700 : 500,
              transition: 'all 0.15s',
            }}
          >
            <LayoutDashboard size={16} />
            Dispositionstafel
          </button>
          <button
            onClick={handleVerwaltungClick}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', border: 'none', borderRadius: 6,
              backgroundColor: currentView === 'verwaltung' ? MARKE : 'transparent',
              color: currentView === 'verwaltung' ? '#fff' : '#64748b',
              cursor: 'pointer', fontSize: 14,
              fontWeight: currentView === 'verwaltung' ? 700 : 500,
              transition: 'all 0.15s',
            }}
          >
            <Settings size={16} />
            Verwaltung
            {!unlocked && <Lock size={12} style={{ opacity: 0.7 }} />}
          </button>
          {unlocked && (
            <button
              onClick={handleLock}
              title="Verwaltung sperren – andere Geräte sehen dann nur noch die Dispositionstafel"
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6,
                backgroundColor: 'transparent', color: '#64748b',
                cursor: 'pointer', fontSize: 13,
              }}
            >
              <Lock size={14} />
              Sperren
            </button>
          )}
        </div>

        {/* Firmenlogo, mittig */}
        <img
          src={logoUrl}
          alt="Muster GaLaBau"
          title="Muster GaLaBau – Baustellendisposition"
          style={{ height: 34, width: 'auto', flexShrink: 0, display: 'block' }}
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, flex: '1 1 0', minWidth: 0 }}>
          <div
            className="kopf-info"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flex: '0 1 auto',
              minWidth: 0,
              overflow: 'hidden',
            }}
          >
          <span className="kopf-zahlen" style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
            {activeBaustellen.length} Baustellen · {personnel.length} Personal · {equipment.length} Geräte
          </span>
          {lastSnapshot && (
            <span
              title={`Letzter lokaler Snapshot: ${lastSnapshot}`}
              style={{
                fontSize: 11,
                color: lastSnapshot === getTodayString() ? MARKE : '#b45309',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                marginRight: 4,
              }}
            >
              ● Gesichert: {lastSnapshot}
            </span>
          )}
          {/* Cloud-Sync-Indikator */}
          <span
            title={cloudConnected ? 'Cloud-Sync aktiv – Daten werden automatisch gespeichert' : 'Cloud-Sync nicht verbunden'}
            style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: cloudConnected ? MARKE : '#94a3b8', marginRight: 4, flexShrink: 0 }}
          >
            {cloudConnected ? <Cloud size={12} /> : <CloudOff size={12} />}
            {cloudConnected ? 'Cloud' : ''}
          </span>
          </div>

          {/* PDF Export */}
          <button
            onClick={() => exportDispositionPDF(baustellen, personnel)}
            style={headerBtn}
          >
            <FileDown size={12} />
            PDF Export
          </button>

          {/* TV Button group */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button
              onClick={openTV}
              title="Hallenansicht in neuem Tab öffnen"
              style={{
                ...headerBtnOhneRahmen(MARKE),
                borderRadius: '6px 0 0 6px',
                borderRight: 'none',
                color: MARKE,
                backgroundColor: MARKE_HELL,
                gap: 5,
              }}
            >
              <Monitor size={12} />
              Hallenansicht
            </button>
            <button
              onClick={() => setShowTVSettings(true)}
              title="Hallenansicht-Einstellungen"
              style={{
                ...headerBtn,
                borderRadius: '0 6px 6px 0',
                padding: '6px 8px',
                border: '1px solid ' + MARKE,
                color: MARKE,
                backgroundColor: MARKE_HELL,
              }}
            >
              <Settings2 size={12} />
            </button>
          </div>

          {/* Reset */}
          <button onClick={handleResetClick} style={headerBtn}>
            <RotateCcw size={12} />
            Reset
          </button>
        </div>
      </header>

      {/* Hint under header when TV settings are accessible */}
      {false && (
        <div style={{ fontSize: 11, color: '#64748b', textAlign: 'center', padding: '4px 0' }}>
          Diese URL auf dem Hallenmonitor öffnen – aktualisiert sich automatisch
        </div>
      )}

      {/* Warnung, wenn der Browser gar nichts speichern laesst.
          Ohne diesen Hinweis saehe die Tafel voellig normal aus und waere
          beim naechsten Oeffnen leer – ohne erkennbaren Grund. */}
      {!istSpeicherVerfuegbar() && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            borderBottom: '1px solid #fca5a5',
            padding: '8px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 13,
            color: '#991b1b',
          }}
        >
          <TriangleAlert size={15} style={{ flexShrink: 0 }} />
          <span>
            <strong>Nichts wird gespeichert.</strong> Dieser Browser erlaubt der
            Tafel keinen dauerhaften Speicher
            {laeuftAlsDatei() ? ' – sie wurde direkt aus einer Datei geöffnet' : ''}.
            Alle Eingaben sind beim nächsten Öffnen wieder weg. Abhilfe schafft
            das vollständige Paket mit Starter.
          </span>
        </div>
      )}

      {/* Reset-Rückgängig-Hinweis */}
      <ResetUndoBanner />

      {/* Content – doppelt abgesichert: auch ein von Hand gesetztes
          currentView darf die Verwaltung auf einem gesperrten Gerät nicht
          öffnen. Die erste Absicherung sitzt im persist.merge. */}
      {currentView === 'verwaltung' && unlocked ? <AdminView /> : <DispositionBoard />}

      {/* Toast Notifications */}
      <ToastContainer />

      {/* PIN-Abfrage */}
      {pinIntent && (
        <PinModal
          title={pinIntent === 'reset' ? 'Reset freigeben' : 'Verwaltung entsperren'}
          hint={
            pinIntent === 'reset'
              ? 'Das Zurücksetzen verwirft den aktuellen Datenstand.'
              : 'Nach der Eingabe bleibt dieses Gerät entsperrt, bis auf „Sperren“ geklickt wird.'
          }
          onSuccess={handlePinSuccess}
          onCancel={() => setPinIntent(null)}
        />
      )}

      {/* TV Settings Modal */}
      {showTVSettings && (
        <TVSettingsModal
          settings={settings}
          onUpdateSection={updateSection}
          onReset={resetSettings}
          onClose={() => setShowTVSettings(false)}
        />
      )}
    </div>
  );
}

export default App;

const headerBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '6px 12px',
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  backgroundColor: '#fff',
  color: '#475569',
  cursor: 'pointer',
  fontSize: 12,
  whiteSpace: 'nowrap',
  flexShrink: 0,
};

/**
 * headerBtn, aber mit einzeln gesetzten Rahmenseiten statt der Kurzform.
 * React warnt, wenn `border` und `borderRight` am selben Element gemischt
 * werden – und der linke Knopf des Hallenansicht-Paars braucht genau das,
 * damit die beiden Knoepfe nahtlos aneinandersitzen.
 */
function headerBtnOhneRahmen(farbe: string): React.CSSProperties {
  const basis: React.CSSProperties = { ...headerBtn };
  delete basis.border;
  return {
    ...basis,
    borderTop: '1px solid ' + farbe,
    borderBottom: '1px solid ' + farbe,
    borderLeft: '1px solid ' + farbe,
  };
}
