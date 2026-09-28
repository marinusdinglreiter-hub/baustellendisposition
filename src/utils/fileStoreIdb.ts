/**
 * IndexedDB-Implementierung von FileStoreAdapter.
 *
 * Eigene Datenbank – bewusst NICHT in `bsd-cloud-sync-db` mit eingemietet,
 * deren Versionszyklus gehoert cloudSync.ts. Der Blob wird direkt gespeichert;
 * structured clone kann das, also kein Base64 und keine Aufblaehung.
 */
import type { BaustelleAttachment } from '../types';
import { generateId } from '../types';
import type { FileStoreAdapter, StoredFileMeta } from './fileStore';

const DB_NAME = 'bsd-files-db';
const DB_VERSION = 1;
const STORE = 'files';
const BY_BAUSTELLE = 'by-baustelle';
const PERSIST_FLAG = 'bsd-storage-persist-asked';

interface FileRecord extends StoredFileMeta {
  blob: Blob;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: 'id' });
        os.createIndex(BY_BAUSTELLE, 'baustelleId', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
        t.onabort = () => {
          db.close();
          reject(t.error);
        };
      })
  );
}

/**
 * Einmalig den dauerhaften Speicher anfragen, damit der Browser die Plaene
 * bei Platzmangel nicht als Wegwerf-Cache behandelt.
 */
async function askForPersistentStorage(): Promise<void> {
  try {
    if (localStorage.getItem(PERSIST_FLAG)) return;
    localStorage.setItem(PERSIST_FLAG, '1');
    await navigator.storage?.persist?.();
  } catch {
    // ignore
  }
}

/** Einmal pruefen und merken – die Antwort aendert sich waehrend einer Sitzung nicht. */
let verfuegbar: Promise<boolean> | null = null;

function pruefeVerfuegbarkeit(): Promise<boolean> {
  if (verfuegbar) return verfuegbar;
  verfuegbar = (async () => {
    try {
      if (typeof indexedDB === 'undefined') return false;
      const db = await openDb();
      db.close();
      return true;
    } catch {
      return false;
    }
  })();
  return verfuegbar;
}

export function createIdbFileStore(): FileStoreAdapter {
  return {
    available: pruefeVerfuegbarkeit,

    async put(baustelleId, file) {
      const meta: BaustelleAttachment = {
        id: generateId(),
        name: file.name,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
        uploadedAt: new Date().toISOString(),
      };
      const record: FileRecord = { ...meta, baustelleId, blob: file };
      await tx('readwrite', (s) => s.put(record));
      void askForPersistentStorage();
      return meta;
    },

    async getBlob(fileId) {
      const rec = (await tx<FileRecord | undefined>('readonly', (s) => s.get(fileId))) ?? null;
      return rec ? rec.blob : null;
    },

    async has(fileId) {
      const n = await tx<number>('readonly', (s) => s.count(fileId));
      return n > 0;
    },

    async remove(fileId) {
      await tx('readwrite', (s) => s.delete(fileId));
    },

    async removeByBaustelle(baustelleId) {
      const db = await openDb();
      await new Promise<void>((resolve, reject) => {
        const t = db.transaction(STORE, 'readwrite');
        const idx = t.objectStore(STORE).index(BY_BAUSTELLE);
        const req = idx.openCursor(IDBKeyRange.only(baustelleId));
        req.onsuccess = () => {
          const cur = req.result;
          if (cur) {
            cur.delete();
            cur.continue();
          }
        };
        req.onerror = () => reject(req.error);
        t.oncomplete = () => {
          db.close();
          resolve();
        };
        t.onabort = () => {
          db.close();
          reject(t.error);
        };
      });
    },

    async listAll() {
      const all = await tx<FileRecord[]>('readonly', (s) => s.getAll());
      // Blobs bewusst abstreifen – die Muellabfuhr braucht nur die Metadaten
      return all.map((r) => ({
        id: r.id,
        baustelleId: r.baustelleId,
        name: r.name,
        size: r.size,
        mimeType: r.mimeType,
        uploadedAt: r.uploadedAt,
      }));
    },

    async estimate() {
      try {
        const e = await navigator.storage?.estimate?.();
        if (!e || e.usage == null || e.quota == null) return null;
        return { usage: e.usage, quota: e.quota };
      } catch {
        return null;
      }
    },
  };
}

/**
 * Loescht Blobs, auf die keine Baustelle mehr zeigt.
 *
 * Die Schonfrist ist kein Luxus: nach einem Reset sind kurzzeitig ALLE Blobs
 * verwaist, obwohl der Reset-Undo-Stand sie noch braucht. Ohne sie wuerde
 * "Reset rueckgaengig" Metadaten auf geloeschte Dateien zurueckholen.
 */
export async function gcOrphanFiles(
  referencedIds: Set<string>,
  graceDays = 7
): Promise<number> {
  try {
    const store = createIdbFileStore();
    const all = await store.listAll();
    const cutoff = Date.now() - graceDays * 86_400_000;
    let removed = 0;
    for (const meta of all) {
      if (referencedIds.has(meta.id)) continue;
      const age = Date.parse(meta.uploadedAt);
      if (Number.isFinite(age) && age > cutoff) continue; // noch in der Schonfrist
      await store.remove(meta.id);
      removed++;
    }
    return removed;
  } catch (e) {
    console.warn('[fileStore] Aufräumen fehlgeschlagen', e);
    return 0;
  }
}
