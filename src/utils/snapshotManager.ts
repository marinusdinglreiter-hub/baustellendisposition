import type { SnapshotData } from '../types';

const SNAPSHOT_PREFIX = 'bsd-snap-';
const LAST_DATE_KEY   = 'bsd-snap-last-date';
const MAX_SNAPSHOTS   = 30;

/** Gibt das heutige Datum als ISO-String (YYYY-MM-DD) zurück */
export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

/** Prüft ob heute noch kein Snapshot erstellt wurde */
export function needsDailySnapshot(): boolean {
  return localStorage.getItem(LAST_DATE_KEY) !== getTodayString();
}

/** Erstellt einen Snapshot für heute und bereinigt alte Snapshots */
export function takeSnapshot(data: SnapshotData): void {
  const today = getTodayString();
  const payload = JSON.stringify({
    date: today,
    data,
    takenAt: new Date().toISOString(),
  });
  try {
    localStorage.setItem(SNAPSHOT_PREFIX + today, payload);
    localStorage.setItem(LAST_DATE_KEY, today);
    pruneOldSnapshots();
  } catch (e) {
    console.warn('[Snapshot] localStorage voll, Snapshot nicht gespeichert', e);
  }
}

export interface SnapshotMeta {
  date: string;
  takenAt: string;
  baustellenCount: number;
  personnelCount: number;
  equipmentCount: number;
}

/** Gibt eine sortierte Liste aller gespeicherten Snapshots zurück (neueste zuerst) */
export function listSnapshots(): SnapshotMeta[] {
  const result: SnapshotMeta[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(SNAPSHOT_PREFIX)) continue;
    // Den Datum-Schlüssel (bsd-snap-last-date) überspringen
    if (key === LAST_DATE_KEY) continue;
    try {
      const parsed = JSON.parse(localStorage.getItem(key)!);
      if (!parsed?.date || !parsed?.data) continue;
      result.push({
        date:            parsed.date,
        takenAt:         parsed.takenAt ?? '',
        baustellenCount: parsed.data.baustellen?.length  ?? 0,
        personnelCount:  parsed.data.personnel?.length   ?? 0,
        equipmentCount:  parsed.data.equipment?.length   ?? 0,
      });
    } catch {
      // Kaputten Eintrag überspringen
    }
  }
  return result.sort((a, b) => b.date.localeCompare(a.date));
}

/** Lädt einen einzelnen Snapshot anhand des Datums */
export function loadSnapshot(date: string): { date: string; data: SnapshotData } | null {
  try {
    const raw = localStorage.getItem(SNAPSHOT_PREFIX + date);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Löscht einen Snapshot anhand des Datums */
export function deleteSnapshot(date: string): void {
  localStorage.removeItem(SNAPSHOT_PREFIX + date);
}

/** Hält die Anzahl der Snapshots auf MAX_SNAPSHOTS */
function pruneOldSnapshots(): void {
  const all = listSnapshots();
  if (all.length > MAX_SNAPSHOTS) {
    all.slice(MAX_SNAPSHOTS).forEach((s) => deleteSnapshot(s.date));
  }
}

/** Exportiert Snapshot-Daten als JSON-Datei (Browser-Download) */
export function exportSnapshotAsJSON(data: SnapshotData, date: string): void {
  const blob = new Blob(
    [JSON.stringify({ exportDate: date, data }, null, 2)],
    { type: 'application/json' }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `baustellendisposition-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Parsed eine importierte JSON-Datei und gibt die Snapshot-Daten zurück */
export function parseImportedJSON(
  raw: string
): { exportDate: string; data: SnapshotData } | { error: string } {
  try {
    const parsed = JSON.parse(raw);
    if (
      !parsed.data?.baustellen ||
      !parsed.data?.personnel  ||
      !parsed.data?.equipment
    ) {
      return { error: 'Ungültiges Dateiformat – Pflichtfelder (baustellen, personnel, equipment) fehlen.' };
    }
    return {
      exportDate: parsed.exportDate ?? 'Unbekannt',
      data: parsed.data as SnapshotData,
    };
  } catch {
    return { error: 'Die Datei konnte nicht gelesen werden (kein gültiges JSON).' };
  }
}

// ─── Reset rückgängig machen ───────────────────────────────────────────────

export const RESET_UNDO_KEY = 'bsd-reset-undo';

export interface ResetUndo {
  takenAt: string;
  data: SnapshotData;
}

/**
 * Das Banner muss auf einen Reset in derselben Sitzung reagieren, nicht erst
 * nach einem Reload – deshalb ein kleiner Benachrichtigungsmechanismus
 * (gleiches Muster wie in utils/adminLock.ts).
 */
const undoListeners = new Set<() => void>();

export function subscribeResetUndo(cb: () => void): () => void {
  undoListeners.add(cb);
  return () => {
    undoListeners.delete(cb);
  };
}

/** Roher localStorage-Wert – stabil, solange sich nichts aendert. */
export function getResetUndoRaw(): string | null {
  try {
    return localStorage.getItem(RESET_UNDO_KEY);
  } catch {
    return null;
  }
}

function notifyUndoChanged() {
  undoListeners.forEach((l) => l());
}

/** Wird unmittelbar VOR resetData() aufgerufen. */
export function saveResetUndo(data: SnapshotData): void {
  try {
    localStorage.setItem(
      RESET_UNDO_KEY,
      JSON.stringify({ takenAt: new Date().toISOString(), data } satisfies ResetUndo)
    );
  } catch (e) {
    console.warn('[Reset] Undo-Stand konnte nicht gesichert werden', e);
  }
  notifyUndoChanged();
}

export function loadResetUndo(): ResetUndo | null {
  try {
    const raw = localStorage.getItem(RESET_UNDO_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ResetUndo;
    if (!parsed?.data?.baustellen) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearResetUndo(): void {
  try {
    localStorage.removeItem(RESET_UNDO_KEY);
  } catch {
    // ignore
  }
  notifyUndoChanged();
}

/**
 * Nur ein frischer Undo-Stand wird angeboten. Nach 24 Stunden ist ein Reset
 * aller Wahrscheinlichkeit nach beabsichtigt gewesen, und ein Zurueckholen
 * wuerde einen Tagesstand wegwerfen statt ihn zu retten.
 */
export function hasFreshResetUndo(maxAgeHours = 24): boolean {
  const u = loadResetUndo();
  if (!u) return false;
  const age = Date.now() - Date.parse(u.takenAt);
  return Number.isFinite(age) && age < maxAgeHours * 3600_000;
}
