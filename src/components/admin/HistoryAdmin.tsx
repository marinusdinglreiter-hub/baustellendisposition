import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import type { SnapshotData } from '../../types';
import {
  listSnapshots,
  loadSnapshot,
  takeSnapshot,
  exportSnapshotAsJSON,
  parseImportedJSON,
  getTodayString,
  type SnapshotMeta,
} from '../../utils/snapshotManager';
import {
  isCloudSyncSupported,
  getSavedHandle,
  clearSavedHandle,
  ensurePermission,
  pickSyncFile,
  pickExistingSyncFile,
  writeSyncFile,
  readSyncFile,
} from '../../utils/cloudSync';
import {
  History,
  Download,
  Upload,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Camera,
  Cloud,
  CloudOff,
  CloudUpload,
  CloudDownload,
  Link,
  Unlink,
  RefreshCw,
} from 'lucide-react';

// ─── Hilfsfunktionen ────────────────────────────────────────────────────────

function formatDateLabel(iso: string): string {
  const today = getTodayString();
  const d = new Date(iso + 'T00:00:00');
  const label = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const diffMs = new Date(today + 'T00:00:00').getTime() - d.getTime();
  const diffDays = Math.round(diffMs / 86_400_000);

  if (diffDays === 0) return `${label} (Heute)`;
  if (diffDays === 1) return `${label} (Gestern)`;
  if (diffDays > 1)   return `${label} (vor ${diffDays} Tagen)`;
  return label;
}

function formatTime(iso: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function formatDateTime(iso: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '';
  }
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const btnPrimary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 14px', border: 'none', borderRadius: 7,
  backgroundColor: '#2563eb', color: '#fff',
  cursor: 'pointer', fontSize: 13, fontWeight: 600,
};

const btnSecondary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '7px 12px', border: '1px solid #d1d5db', borderRadius: 7,
  backgroundColor: '#f9fafb', color: '#374151',
  cursor: 'pointer', fontSize: 13,
};

const btnDanger: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '7px 12px', border: '1px solid #fca5a5', borderRadius: 7,
  backgroundColor: '#fef2f2', color: '#dc2626',
  cursor: 'pointer', fontSize: 13, fontWeight: 600,
};

const btnSmall: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '5px 10px', border: '1px solid #d1d5db', borderRadius: 6,
  backgroundColor: '#f9fafb', color: '#374151',
  cursor: 'pointer', fontSize: 12,
};

const btnGreen: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '7px 12px', border: '1px solid #86efac', borderRadius: 7,
  backgroundColor: '#f0fdf4', color: '#15803d',
  cursor: 'pointer', fontSize: 13, fontWeight: 600,
};

// ─── Cloud-Sync-Sektion ──────────────────────────────────────────────────────

type CloudStatus = 'unknown' | 'disconnected' | 'needs-permission' | 'connected' | 'error';

function CloudSyncSection({
  onStatus,
}: {
  onStatus: (connected: boolean) => void;
}) {
  const { baustellen, personnel, equipment, aboBaustellen, aboCreatedMarkers, restoreSnapshot } = useStore();

  const [status, setStatus]           = useState<CloudStatus>('unknown');
  const [handle, setHandle]           = useState<FileSystemFileHandle | null>(null);
  const [fileName, setFileName]       = useState<string>('');
  const [lastSynced, setLastSynced]   = useState<string>('');
  const [loading, setLoading]         = useState(false);
  const [msg, setMsg]                 = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmLoad, setConfirmLoad] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<{ syncedAt: string; data: SnapshotData } | null>(null);

  const supported = isCloudSyncSupported();

  // Beim Laden: gespeicherten Handle prüfen
  useEffect(() => {
    if (!supported) { setStatus('disconnected'); return; }
    getSavedHandle().then(async (h) => {
      if (!h) { setStatus('disconnected'); return; }
      setHandle(h);
      setFileName(h.name);
      const perm = await h.queryPermission({ mode: 'readwrite' });
      setStatus(perm === 'granted' ? 'connected' : 'needs-permission');
      onStatus(perm === 'granted');
    }).catch(() => setStatus('disconnected'));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function showMsg(type: 'success' | 'error', text: string) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 5000);
  }

  // ── Neue Datei wählen (Ersteinrichtung oder Wechsel) ──────────────────────
  async function handlePickNew() {
    setLoading(true);
    const h = await pickSyncFile();
    if (!h) { setLoading(false); return; }
    setHandle(h);
    setFileName(h.name);
    // Direkt aktuellen Stand in die neue Datei schreiben
    try {
      const data: SnapshotData = { baustellen, personnel, equipment, aboBaustellen, aboCreatedMarkers };
      await writeSyncFile(h, data);
      setLastSynced(new Date().toISOString());
      setStatus('connected');
      onStatus(true);
      showMsg('success', `Verbunden mit „${h.name}" – aktueller Stand wurde gespeichert`);
    } catch {
      showMsg('error', 'Datei konnte nicht beschrieben werden');
      setStatus('error');
    }
    setLoading(false);
  }

  // ── Vorhandene Datei öffnen (anderer PC) ─────────────────────────────────
  async function handlePickExisting() {
    setLoading(true);
    const h = await pickExistingSyncFile();
    if (!h) { setLoading(false); return; }
    setHandle(h);
    setFileName(h.name);
    try {
      const payload = await readSyncFile(h);
      if (payload) {
        setPendingPayload(payload);
        setConfirmLoad(true);
      } else {
        // Leere / neue Datei → gleich befüllen
        const data: SnapshotData = { baustellen, personnel, equipment, aboBaustellen, aboCreatedMarkers };
        await writeSyncFile(h, data);
        setLastSynced(new Date().toISOString());
        showMsg('success', `Verbunden mit „${h.name}"  – aktueller Stand gespeichert`);
      }
      setStatus('connected');
      onStatus(true);
    } catch {
      showMsg('error', 'Datei konnte nicht gelesen werden');
      setStatus('error');
    }
    setLoading(false);
  }

  // ── Berechtigung erneut anfordern ─────────────────────────────────────────
  async function handleReconnect() {
    if (!handle) return;
    setLoading(true);
    const ok = await ensurePermission(handle);
    if (ok) {
      setStatus('connected');
      onStatus(true);
      showMsg('success', `Wieder verbunden mit „${fileName}"`);
    } else {
      showMsg('error', 'Berechtigung wurde verweigert');
    }
    setLoading(false);
  }

  // ── Manuell speichern ─────────────────────────────────────────────────────
  async function handleSaveNow() {
    if (!handle) return;
    setLoading(true);
    try {
      const ok = await ensurePermission(handle);
      if (!ok) { showMsg('error', 'Keine Berechtigung'); setLoading(false); return; }
      const data: SnapshotData = { baustellen, personnel, equipment, aboBaustellen, aboCreatedMarkers };
      await writeSyncFile(handle, data);
      setLastSynced(new Date().toISOString());
      showMsg('success', 'Aktueller Stand wurde in die Cloud-Datei gespeichert');
    } catch {
      showMsg('error', 'Speichern fehlgeschlagen – bitte Berechtigung prüfen');
    }
    setLoading(false);
  }

  // ── Von Datei laden ───────────────────────────────────────────────────────
  async function handleLoadNow() {
    if (!handle) return;
    setLoading(true);
    try {
      const ok = await ensurePermission(handle);
      if (!ok) { showMsg('error', 'Keine Berechtigung'); setLoading(false); return; }
      const payload = await readSyncFile(handle);
      if (!payload) { showMsg('error', 'Datei leer oder ungültiges Format'); setLoading(false); return; }
      setPendingPayload(payload);
      setConfirmLoad(true);
    } catch {
      showMsg('error', 'Laden fehlgeschlagen');
    }
    setLoading(false);
  }

  // ── Laden bestätigen ──────────────────────────────────────────────────────
  function handleConfirmLoad() {
    if (!pendingPayload) return;
    restoreSnapshot(pendingPayload.data);
    setConfirmLoad(false);
    setPendingPayload(null);
    showMsg('success', `Stand vom ${formatDateTime(pendingPayload.syncedAt)} wurde geladen`);
  }

  // ── Verbindung trennen ────────────────────────────────────────────────────
  async function handleDisconnect() {
    await clearSavedHandle();
    setHandle(null);
    setFileName('');
    setLastSynced('');
    setStatus('disconnected');
    onStatus(false);
    showMsg('success', 'Cloud-Verbindung getrennt');
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const isConnected = status === 'connected';

  return (
    <div style={{
      border: `2px solid ${isConnected ? '#86efac' : '#e5e7eb'}`,
      borderRadius: 12,
      marginBottom: 24,
      overflow: 'hidden',
      backgroundColor: isConnected ? '#f0fdf4' : '#fff',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px',
        display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: isConnected ? '#dcfce7' : '#f9fafb',
      }}>
        {isConnected
          ? <Cloud size={20} color="#16a34a" />
          : <CloudOff size={20} color="#9ca3af" />
        }
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: isConnected ? '#15803d' : '#374151' }}>
            {isConnected ? '☁️ Cloud-Sync aktiv' : '☁️ Cloud-Sync (OneDrive / Netzlaufwerk)'}
          </div>
          {isConnected && (
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              {fileName && <span>Datei: <strong>{fileName}</strong></span>}
              {lastSynced && <span style={{ marginLeft: 10 }}>· Zuletzt gespeichert: {formatDateTime(lastSynced)}</span>}
            </div>
          )}
          {status === 'needs-permission' && (
            <div style={{ fontSize: 12, color: '#b45309' }}>
              Verbindung zu „{fileName}" gefunden – Berechtigung erforderlich
            </div>
          )}
        </div>
        {/* Status-Badge */}
        <span style={{
          fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 10,
          backgroundColor: isConnected ? '#dcfce7' : status === 'needs-permission' ? '#fef9c3' : '#f3f4f6',
          color: isConnected ? '#15803d' : status === 'needs-permission' ? '#92400e' : '#6b7280',
          border: `1px solid ${isConnected ? '#86efac' : status === 'needs-permission' ? '#fde68a' : '#e5e7eb'}`,
        }}>
          {isConnected ? '✓ Verbunden' : status === 'needs-permission' ? '⚠ Berechtigung' : '○ Nicht verbunden'}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 18px' }}>
        {!supported && (
          <div style={{ fontSize: 13, color: '#b45309', backgroundColor: '#fef9c3', padding: '10px 14px', borderRadius: 8, border: '1px solid #fde68a' }}>
            ⚠️ Dein Browser unterstützt die Datei-API nicht. Bitte Chrome oder Edge verwenden.
          </div>
        )}

        {supported && (
          <>
            {/* Aktionen je nach Status */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {/* Nicht verbunden */}
              {(status === 'disconnected' || status === 'unknown') && (
                <>
                  <button style={btnPrimary} onClick={handlePickNew} disabled={loading}>
                    <Link size={14} />
                    Neue Datei erstellen &amp; verbinden
                  </button>
                  <button style={btnSecondary} onClick={handlePickExisting} disabled={loading}>
                    <CloudDownload size={14} />
                    Vorhandene Datei öffnen (anderer PC)
                  </button>
                </>
              )}

              {/* Berechtigung fehlt */}
              {status === 'needs-permission' && (
                <>
                  <button style={btnGreen} onClick={handleReconnect} disabled={loading}>
                    <RefreshCw size={14} />
                    Erneut verbinden
                  </button>
                  <button style={btnSecondary} onClick={handlePickExisting} disabled={loading}>
                    <CloudDownload size={14} />
                    Andere Datei wählen
                  </button>
                </>
              )}

              {/* Verbunden */}
              {isConnected && (
                <>
                  <button style={btnGreen} onClick={handleSaveNow} disabled={loading}>
                    <CloudUpload size={14} />
                    Jetzt speichern
                  </button>
                  <button style={btnSecondary} onClick={handleLoadNow} disabled={loading}>
                    <CloudDownload size={14} />
                    Von Datei laden
                  </button>
                  <button style={btnSecondary} onClick={handlePickNew} disabled={loading}>
                    <Link size={14} />
                    Andere Datei wählen
                  </button>
                  <button style={{ ...btnSecondary, color: '#dc2626', borderColor: '#fca5a5' }} onClick={handleDisconnect} disabled={loading}>
                    <Unlink size={14} />
                    Trennen
                  </button>
                </>
              )}
            </div>

            {/* Erklärungstext */}
            {!isConnected && (
              <p style={{ margin: '12px 0 0', fontSize: 12, color: '#6b7280' }}>
                <strong>So funktioniert es:</strong> Wähle eine Datei in deinem OneDrive-Ordner (oder einem Netzlaufwerk).
                Die App speichert dort automatisch den aktuellen Stand – und jeder PC mit Zugriff auf diesen Ordner kann die Daten laden.
              </p>
            )}

            {isConnected && (
              <p style={{ margin: '12px 0 0', fontSize: 12, color: '#6b7280' }}>
                Die Daten werden automatisch gespeichert, wenn du Änderungen machst.
                Auf anderen PCs: Tab „💾 Verlauf" öffnen → „Erneut verbinden" → „Von Datei laden".
              </p>
            )}
          </>
        )}

        {/* Status-Meldung */}
        {msg && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 14px', borderRadius: 8, marginTop: 12,
            backgroundColor: msg.type === 'success' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${msg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            color: msg.type === 'success' ? '#15803d' : '#dc2626', fontSize: 13,
          }}>
            {msg.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
            {msg.text}
          </div>
        )}

        {/* Bestätigung: Laden */}
        {confirmLoad && pendingPayload && (
          <div style={{
            marginTop: 12, padding: '12px 16px', borderRadius: 8,
            backgroundColor: '#fffbeb', border: '1px solid #fde68a',
          }}>
            <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, color: '#92400e' }}>
              📥 Cloud-Daten gefunden – Aktuellen Stand überschreiben?
            </p>
            <p style={{ margin: '0 0 10px', fontSize: 12, color: '#374151' }}>
              Stand aus Datei: <strong>{formatDateTime(pendingPayload.syncedAt)}</strong>
              &nbsp;({pendingPayload.data.baustellen.length} Baustellen · {pendingPayload.data.personnel.length} Personal)
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={btnSecondary} onClick={() => { setConfirmLoad(false); setPendingPayload(null); }}>
                Abbrechen
              </button>
              <button style={btnDanger} onClick={handleConfirmLoad}>
                <CloudDownload size={13} />
                Ja, Cloud-Daten laden
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Hauptkomponente ─────────────────────────────────────────────────────────

export function HistoryAdmin() {
  const {
    baustellen, personnel, equipment, aboBaustellen, aboCreatedMarkers,
    restoreSnapshot,
  } = useStore();

  const [snapshots, setSnapshots]     = useState<SnapshotMeta[]>([]);
  const [confirmDate, setConfirmDate] = useState<string | null>(null);
  const [statusMsg, setStatusMsg]     = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef                  = useRef<HTMLInputElement>(null);

  // Snapshots beim Laden der Komponente einlesen
  useEffect(() => {
    setSnapshots(listSnapshots());
  }, []);

  function refreshList() {
    setSnapshots(listSnapshots());
  }

  // ── Aktionen ───────────────────────────────────────────────────────────────

  function handleManualSnapshot() {
    const data: SnapshotData = { baustellen, personnel, equipment, aboBaustellen, aboCreatedMarkers };
    takeSnapshot(data);
    refreshList();
    showStatus('success', `Snapshot für heute (${getTodayString()}) gespeichert`);
  }

  function handleExportCurrent() {
    const data: SnapshotData = { baustellen, personnel, equipment, aboBaustellen, aboCreatedMarkers };
    exportSnapshotAsJSON(data, getTodayString());
  }

  function handleExportSnapshot(date: string) {
    const snap = loadSnapshot(date);
    if (!snap) { showStatus('error', 'Snapshot konnte nicht geladen werden'); return; }
    exportSnapshotAsJSON(snap.data, date);
  }

  function handleRestoreConfirm() {
    if (!confirmDate) return;
    const snap = loadSnapshot(confirmDate);
    if (!snap) { showStatus('error', 'Snapshot konnte nicht geladen werden'); setConfirmDate(null); return; }
    restoreSnapshot(snap.data);
    setConfirmDate(null);
    showStatus('success', `Stand vom ${formatDateLabel(snap.date)} wurde wiederhergestellt`);
  }

  function handleImportClick() {
    setImportError(null);
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const raw = ev.target?.result as string;
      const result = parseImportedJSON(raw);
      if ('error' in result) {
        setImportError(result.error);
        return;
      }
      restoreSnapshot(result.data);
      showStatus('success', `Import erfolgreich – Stand vom ${result.exportDate} wiederhergestellt`);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function showStatus(type: 'success' | 'error', text: string) {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 5000);
  }

  const todayHasSnapshot = snapshots.some((s) => s.date === getTodayString());

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 800 }}>
      {/* Titel */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
          <History size={20} color="#2563eb" />
          Verlauf &amp; Datensicherung
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
          Automatische Tages-Snapshots + Cloud-Sync über OneDrive oder Netzlaufwerk.
        </p>
      </div>

      {/* ── Cloud-Sync-Sektion ── */}
      <CloudSyncSection onStatus={() => {}} />

      {/* ── Manuelle Sicherung ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
          Manuelle Sicherung &amp; Export
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button style={btnPrimary} onClick={handleManualSnapshot}>
            <Camera size={14} />
            Jetzt Snapshot sichern
          </button>
          <button style={btnSecondary} onClick={handleExportCurrent}>
            <Download size={14} />
            Aktuelle Daten als JSON
          </button>
          <button style={btnSecondary} onClick={handleImportClick}>
            <Upload size={14} />
            JSON-Datei importieren
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* Status-Meldungen */}
      {statusMsg && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px', borderRadius: 8, marginBottom: 14,
          backgroundColor: statusMsg.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${statusMsg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          color: statusMsg.type === 'success' ? '#15803d' : '#dc2626', fontSize: 13,
        }}>
          {statusMsg.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {statusMsg.text}
        </div>
      )}

      {importError && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px', borderRadius: 8, marginBottom: 14,
          backgroundColor: '#fef2f2', border: '1px solid #fecaca',
          color: '#dc2626', fontSize: 13,
        }}>
          <AlertCircle size={15} />
          {importError}
        </div>
      )}

      {!todayHasSnapshot && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, marginBottom: 14,
          backgroundColor: '#fffbeb', border: '1px solid #fde68a',
          color: '#92400e', fontSize: 13,
        }}>
          ⚠️ Noch kein Snapshot für heute. Beim nächsten App-Start wird automatisch einer erstellt.
        </div>
      )}

      {/* ── Snapshot-Liste ── */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{
          padding: '12px 16px', borderBottom: '1px solid #f3f4f6',
          fontSize: 13, fontWeight: 600, color: '#374151',
        }}>
          Lokale Tages-Snapshots ({snapshots.length} gespeichert, max. 30 Tage)
        </div>

        {snapshots.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
            <History size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
            <div>Noch keine Snapshots vorhanden.</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Beim nächsten App-Start wird automatisch einer erstellt.</div>
          </div>
        ) : (
          snapshots.map((snap, idx) => {
            const isConfirming = confirmDate === snap.date;
            const isToday = snap.date === getTodayString();
            return (
              <div
                key={snap.date}
                style={{
                  borderBottom: idx < snapshots.length - 1 ? '1px solid #f3f4f6' : 'none',
                  backgroundColor: isToday ? '#f0f9ff' : '#fff',
                }}
              >
                <div style={{
                  padding: '12px 16px',
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
                }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: isToday ? 700 : 500, color: isToday ? '#1d4ed8' : '#111827' }}>
                      {isToday && (
                        <span style={{ marginRight: 6, fontSize: 11, backgroundColor: '#dbeafe', color: '#1d4ed8', padding: '1px 6px', borderRadius: 10, fontWeight: 600 }}>
                          HEUTE
                        </span>
                      )}
                      {formatDateLabel(snap.date)}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                      {snap.baustellenCount} Baustellen · {snap.personnelCount} Personal · {snap.equipmentCount} Geräte
                      {snap.takenAt && <span style={{ marginLeft: 8 }}>· gesichert {formatTime(snap.takenAt)} Uhr</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={btnSmall} onClick={() => handleExportSnapshot(snap.date)}>
                      <Download size={12} />
                      Exportieren
                    </button>
                    <button
                      style={{ ...btnSmall, color: isConfirming ? '#dc2626' : '#374151', borderColor: isConfirming ? '#fca5a5' : '#d1d5db' }}
                      onClick={() => setConfirmDate(isConfirming ? null : snap.date)}
                    >
                      <RotateCcw size={12} />
                      Wiederherstellen
                    </button>
                  </div>
                </div>

                {isConfirming && (
                  <div style={{ margin: '0 16px 12px', padding: '12px 16px', borderRadius: 8, backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
                    <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: '#dc2626' }}>
                      ⚠️ Achtung: Aktuellen Stand überschreiben?
                    </p>
                    <p style={{ margin: '0 0 10px', fontSize: 12, color: '#374151' }}>
                      Der aktuelle Datenstand wird durch den Snapshot vom <strong>{formatDateLabel(snap.date)}</strong> ersetzt.
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button style={btnSecondary} onClick={() => setConfirmDate(null)}>Abbrechen</button>
                      <button style={btnDanger} onClick={handleRestoreConfirm}>
                        <RotateCcw size={13} />
                        Ja, wiederherstellen
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 12 }}>
        Lokale Snapshots liegen im Browser-Speicher und bleiben nach PC-Neustart erhalten.
        Für geräteübergreifende Nutzung empfehlen wir den Cloud-Sync über OneDrive.
      </p>
    </div>
  );
}
