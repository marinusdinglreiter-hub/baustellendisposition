/**
 * Geraetegebundene Sperre der Verwaltung.
 *
 * ACHTUNG – Bedrohungsmodell: der Store liegt im Klartext in localStorage,
 * die Sync-Datei ist unverschluesseltes JSON im OneDrive. Wer F12 drueckt,
 * liest die PIN in zehn Sekunden. Das hier schuetzt davor, dass jemand
 * VERSEHENTLICH die Stammdaten aendert oder Reset drueckt. Es ist keine
 * Sicherheitsfunktion und darf auch nie als solche verkauft werden.
 *
 * Der Entsperr-Zustand liegt bewusst in localStorage und nicht im Store:
 * er muss pro Geraet gelten und darf nicht ueber die Sync-Datei wandern.
 */
import { useSyncExternalStore } from 'react';

export const ADMIN_UNLOCK_KEY = 'bsd-admin-unlocked';
export const DEFAULT_ADMIN_PIN = '1234';

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

/**
 * Synchron und kein Hook – `persist.merge` ruft das waehrend der Hydration auf.
 */
export function isAdminUnlocked(): boolean {
  try {
    return localStorage.getItem(ADMIN_UNLOCK_KEY) === '1';
  } catch {
    return false;
  }
}

export function unlockAdmin(): void {
  try {
    localStorage.setItem(ADMIN_UNLOCK_KEY, '1');
  } catch {
    // Privater Modus o. ae. – dann gilt die Entsperrung nur bis zum Reload.
  }
  emit();
}

export function lockAdmin(): void {
  try {
    localStorage.removeItem(ADMIN_UNLOCK_KEY);
  } catch {
    // ignore
  }
  emit();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  // Auch reagieren, wenn ein anderer Tab desselben Geraets ent-/sperrt.
  const onStorage = (e: StorageEvent) => {
    if (e.key === ADMIN_UNLOCK_KEY) cb();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', onStorage);
  };
}

export function useAdminLock(): { unlocked: boolean; unlock: () => void; lock: () => void } {
  const unlocked = useSyncExternalStore(subscribe, isAdminUnlocked, () => false);
  return { unlocked, unlock: unlockAdmin, lock: lockAdmin };
}
