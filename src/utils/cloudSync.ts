/**
 * Cloud-Sync via File System Access API
 *
 * Ermöglicht das Speichern/Laden der App-Daten in eine Datei
 * auf OneDrive, einem Netzlaufwerk oder einer lokalen Festplatte.
 * Die Datei-Auswahl wird in IndexedDB gespeichert, sodass der
 * Browser sich die Verbindung merkt.
 *
 * Unterstützte Browser: Chrome 86+, Edge 86+
 * Nicht unterstützt: Firefox
 */

import type { SnapshotData } from '../types';

// ─── IndexedDB für den gespeicherten FileHandle ────────────────────────────

const IDB_NAME    = 'bsd-cloud-sync-db';
const IDB_VERSION = 1;
const IDB_STORE   = 'handles';
const HANDLE_KEY  = 'syncFileHandle';

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function idbPut(value: FileSystemFileHandle): Promise<void> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(IDB_STORE, 'readwrite');
    const req = tx.objectStore(IDB_STORE).put(value, HANDLE_KEY);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

async function idbGet(): Promise<FileSystemFileHandle | null> {
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      const tx  = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(HANDLE_KEY);
      req.onsuccess = () => resolve((req.result as FileSystemFileHandle) ?? null);
      req.onerror   = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function idbDelete(): Promise<void> {
  const db = await openIDB();
  return new Promise((resolve) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(HANDLE_KEY);
    tx.oncomplete = () => resolve();
  });
}

// ─── Öffentliche API ───────────────────────────────────────────────────────

/** Prüft, ob der Browser die File System Access API unterstützt */
export function isCloudSyncSupported(): boolean {
  return typeof window !== 'undefined' && 'showSaveFilePicker' in window;
}

/** Liest den gespeicherten FileHandle aus IndexedDB */
export async function getSavedHandle(): Promise<FileSystemFileHandle | null> {
  return idbGet();
}

/** Löscht den gespeicherten FileHandle (trennt die Verbindung) */
export async function clearSavedHandle(): Promise<void> {
  return idbDelete();
}

/**
 * Prüft und fordert ggf. Lese-/Schreibberechtigung für den Handle an.
 * Muss von einem User-Gesture (Button-Click) aufgerufen werden.
 */
export async function ensurePermission(
  handle: FileSystemFileHandle
): Promise<boolean> {
  const opts = { mode: 'readwrite' as FileSystemPermissionMode };
  if ((await handle.queryPermission(opts)) === 'granted') return true;
  return (await handle.requestPermission(opts)) === 'granted';
}

/**
 * Öffnet den Datei-Speichern-Dialog.
 * Schlägt `baustellendisposition-sync.json` als Namen vor.
 * Speichert den Handle in IndexedDB.
 * Gibt null zurück, wenn der Nutzer abbricht.
 */
export async function pickSyncFile(): Promise<FileSystemFileHandle | null> {
  if (!isCloudSyncSupported()) return null;
  try {
    const handle = await window.showSaveFilePicker!({
      suggestedName: 'baustellendisposition-sync.json',
      types: [
        {
          description: 'JSON-Datei',
          accept: { 'application/json': ['.json'] },
        },
      ],
    });
    await idbPut(handle);
    return handle;
  } catch {
    // AbortError = Nutzer hat Abbrechen gedrückt
    return null;
  }
}

/**
 * Öffnet den Datei-Öffnen-Dialog zum Auswählen einer vorhandenen Sync-Datei
 * (z. B. auf einem anderen PC erstellt).
 * Speichert den Handle in IndexedDB.
 */
export async function pickExistingSyncFile(): Promise<FileSystemFileHandle | null> {
  if (!isCloudSyncSupported()) return null;
  try {
    const [handle] = await window.showOpenFilePicker!({
      types: [
        {
          description: 'JSON-Datei',
          accept: { 'application/json': ['.json'] },
        },
      ],
      multiple: false,
    });
    await idbPut(handle);
    return handle;
  } catch {
    return null;
  }
}

export interface SyncPayload {
  syncedAt: string;
  data: SnapshotData;
}

/** Schreibt die Daten in die verbundene Datei */
export async function writeSyncFile(
  handle: FileSystemFileHandle,
  data: SnapshotData
): Promise<void> {
  const payload: SyncPayload = {
    syncedAt: new Date().toISOString(),
    data,
  };
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(payload, null, 2));
  await writable.close();
}

/**
 * Liest die Daten aus der verbundenen Datei.
 * Gibt null zurück wenn die Datei leer oder ungültig ist.
 */
export async function readSyncFile(
  handle: FileSystemFileHandle
): Promise<SyncPayload | null> {
  try {
    const file = await handle.getFile();
    const text = await file.text();
    if (!text.trim()) return null;
    const parsed = JSON.parse(text) as SyncPayload;
    if (!parsed.data?.baustellen || !parsed.data?.personnel || !parsed.data?.equipment) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
