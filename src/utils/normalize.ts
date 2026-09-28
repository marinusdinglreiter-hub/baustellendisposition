/**
 * Normalisierung aller Datensaetze, die von aussen in den Store gelangen.
 *
 * Warum das noetig ist: zustand `persist` merged nur auf oberster Ebene flach.
 * Ein neues Feld INNERHALB eines gespeicherten Datensatzes waere also
 * `undefined`. Dazu kommen drei Pfade, die jederzeit fremde Datensaetze
 * einschleusen koennen: `restoreSnapshot` (alte Snapshots, JSON-Import,
 * Sync-Datei von einem Rechner mit aelterem Stand), `resetData` und
 * `applyAboBaustellen`.
 *
 * Alle Funktionen hier sind rein und idempotent.
 */
import type {
  Baustelle,
  Personnel,
  Equipment,
  SnapshotData,
  VehicleAppointment,
} from '../types';
import { MAX_APPOINTMENTS_PER_EQUIPMENT } from '../types';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isValidAppointment(a: VehicleAppointment | null | undefined): a is VehicleAppointment {
  return !!a && typeof a.id === 'string' && typeof a.date === 'string' && ISO_DATE.test(a.date);
}

/**
 * Sortiert nach `sortOrder` (fehlende ans Ende) und schreibt `sortOrder`
 * danach dicht auf 0..n-1 neu.
 *
 * Datensaetze ohne `sortOrder` behalten ihre Eingangsreihenfolge – das ist
 * die richtige Bedeutung von "keine Reihenfolge festgelegt" und haelt die
 * Seed-Reihenfolge bv1..bv9 stabil. (Ein Tiebreaker ueber Name waere hier
 * falsch: er wuerde die Tafel beim ersten Start alphabetisch umsortieren.)
 * MAX_SAFE_INTEGER statt Infinity, weil Infinity - Infinity = NaN den
 * Vergleicher zerstoeren wuerde.
 *
 * Das Ergebnis ist bereits in Anzeigereihenfolge – die Tafel muss nie
 * sortieren, und Umsortieren ist ein einfaches Array-Move.
 */
export function normalizeBaustellen(list: Baustelle[] | undefined | null): Baustelle[] {
  const arr = (list ?? []).filter((b): b is Baustelle => !!b && typeof b.id === 'string');

  const sorted = arr
    .map((b, i) => ({ b, i }))
    .sort((x, y) => {
      const sa = typeof x.b.sortOrder === 'number' ? x.b.sortOrder : Number.MAX_SAFE_INTEGER;
      const sb = typeof y.b.sortOrder === 'number' ? y.b.sortOrder : Number.MAX_SAFE_INTEGER;
      if (sa !== sb) return sa - sb;
      return x.i - y.i;
    })
    .map((x) => x.b);

  return sorted.map((b, i) => ({
    ...b,
    notes: b.notes ?? '',
    address: b.address ?? '',
    client: b.client ?? '',
    attachments: (b.attachments ?? []).filter((a) => !!a && typeof a.id === 'string'),
    // Strikt === true statt ?? false: ueber Cloud-Sync und alte Snapshots
    // kann ein wahrheitsaehnlicher Wert hereinkommen.
    kurzfristig: b.kurzfristig === true,
    sortOrder: i,
  }));
}

export function normalizePersonnelList(list: Personnel[] | undefined | null): Personnel[] {
  return (list ?? [])
    .filter((p): p is Personnel => !!p && typeof p.id === 'string')
    .map((p) => ({
      ...p,
      phone: p.phone ?? '',
      notes: p.notes ?? '',
      recurringRules: p.recurringRules ?? [],
      autoAbsent: p.autoAbsent ?? false,
    }));
}

export function normalizeEquipmentList(list: Equipment[] | undefined | null): Equipment[] {
  return (list ?? [])
    .filter((e): e is Equipment => !!e && typeof e.id === 'string')
    .map((e) => ({
      ...e,
      licensePlate: e.licensePlate ?? '',
      notes: e.notes ?? '',
      // iconKey bewusst unangetastet: die Heuristik laeuft beim Rendern,
      // gespeichert wird nur eine bewusste Auswahl aus der Verwaltung.
      appointments: (e.appointments ?? [])
        .filter(isValidAppointment)
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
        .slice(0, MAX_APPOINTMENTS_PER_EQUIPMENT),
    }));
}

/** Die eine Funktion, die jeder Fremddaten-Pfad aufruft. */
export function normalizeSnapshot(d: Partial<SnapshotData> | undefined | null): SnapshotData {
  return {
    baustellen: normalizeBaustellen(d?.baustellen),
    personnel: normalizePersonnelList(d?.personnel),
    equipment: normalizeEquipmentList(d?.equipment),
    aboBaustellen: d?.aboBaustellen ?? [],
    aboCreatedMarkers: d?.aboCreatedMarkers ?? [],
  };
}
