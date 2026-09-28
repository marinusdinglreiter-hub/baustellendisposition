/**
 * Ablage der Datei-Anhaenge (Plaene) einer Baustelle.
 *
 * Bewusst hinter einem schmalen Interface: die Blobs liegen heute in
 * IndexedDB des jeweiligen Geraets. Zieht die Anwendung spaeter auf einen
 * gemeinsamen Server um (z. B. Supabase Storage), muss nur eine zweite
 * Implementierung dieses Interfaces her und der Singleton unten zeigt
 * woanders hin – der Rest der Anwendung bleibt unangetastet.
 *
 * WICHTIG: die Metadaten (BaustelleAttachment) liegen im Store und wandern
 * ueber die Cloud-Sync-Datei auf andere Rechner. Die Blobs tun das NICHT.
 * Auf einem zweiten Geraet erscheint eine Datei also als Zeile ohne Inhalt;
 * die Oberflaeche muss das anzeigen statt daran zu zerbrechen.
 */
import type { BaustelleAttachment } from '../types';
import { createIdbFileStore } from './fileStoreIdb';

export interface StoredFileMeta extends BaustelleAttachment {
  baustelleId: string;
}

export interface FileStoreAdapter {
  /**
   * Steht die Ablage auf diesem Geraet ueberhaupt zur Verfuegung?
   *
   * Nein zum Beispiel dann, wenn die Tafel als einzelne HTML-Datei per
   * Doppelklick geoeffnet wurde: Chrome sperrt IndexedDB auf file://-Adressen.
   * Die Oberflaeche muss das sagen, statt den Nutzer ins Leere laufen zu lassen.
   */
  available(): Promise<boolean>;
  put(baustelleId: string, file: File): Promise<BaustelleAttachment>;
  getBlob(fileId: string): Promise<Blob | null>;
  has(fileId: string): Promise<boolean>;
  remove(fileId: string): Promise<void>;
  removeByBaustelle(baustelleId: string): Promise<void>;
  /** Alle lokal vorhandenen Datei-IDs – Grundlage fuer die Muellabfuhr */
  listAll(): Promise<StoredFileMeta[]>;
  estimate(): Promise<{ usage: number; quota: number } | null>;
}

export const fileStore: FileStoreAdapter = createIdbFileStore();

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
