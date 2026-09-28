// Resource types
export type PersonnelRole = 'Bauleitung' | 'Vorarbeiter' | 'Facharbeiter' | 'Azubi';
export type VehicleCategory = 'Fahrzeug' | 'Anhänger' | 'LKW';
export type MachineCategory = 'Bagger' | 'Rüttelplatte' | 'Radlader' | 'Minibagger' | 'Dumper' | 'Sonstige Maschine';
export type EquipmentCategory = VehicleCategory | MachineCategory;
export type ResourceCategory = 'personal' | 'fahrzeug' | 'maschine';

// Pool IDs
export type PersonnelPool = 'verfuegbar' | 'krank' | 'schule' | 'frei' | 'nicht_verfuegbar';
export type EquipmentPool = 'fuhrpark' | 'maschinenpark' | 'in_reparatur' | 'ausser_betrieb';
export type PoolId = PersonnelPool | EquipmentPool;

// ─── Symbole (Fuhrpark / Maschinenpark / Personal) ─────────────────────────
/** Schluessel in den Symbol-Katalog in components/resourceVisuals.tsx */
export type IconKey =
  | 'person'
  | 'pritsche' | 'planwagen' | 'anhaenger' | 'lkw'
  | 'bagger' | 'minibagger' | 'radlader' | 'ruettelplatte'
  | 'dumper' | 'maschine-sonstige';

// ─── KFZ-Termine ───────────────────────────────────────────────────────────
export type AppointmentType = 'TÜV' | 'UVV' | 'Service' | 'Sonstiges';

export interface VehicleAppointment {
  id: string;
  type: AppointmentType;
  /** Freitext, z. B. "HU + AU Werkstatt Huber" */
  label: string;
  /** 'YYYY-MM-DD' – reines Datum, keine Uhrzeit */
  date: string;
}

export const MAX_APPOINTMENTS_PER_EQUIPMENT = 3;
export const APPOINTMENT_TYPES: AppointmentType[] = ['TÜV', 'UVV', 'Service', 'Sonstiges'];

// ─── Datei-Anhaenge an Baustellen ──────────────────────────────────────────
/**
 * Metadaten eines Anhangs. Der eigentliche Blob liegt in IndexedDB
 * (siehe utils/fileStore.ts) und wandert NICHT ueber die Cloud-Sync-Datei.
 */
export interface BaustelleAttachment {
  /** identisch mit dem Schluessel des IndexedDB-Datensatzes */
  id: string;
  name: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

export const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;

// Baustellen
export type BaustellenStatus = 'Vorbereitung' | 'Aktiv' | 'Nachbereitung' | 'Archiviert';

export interface Baustelle {
  id: string;
  name: string;
  address: string;
  status: BaustellenStatus;
  client: string;
  notes: string;
  startDate: string;
  endDate: string;
  color: string;
  createdAt: string;
  /** Position auf der Tafel, dicht 0..n-1 (siehe utils/normalize.ts) */
  sortOrder?: number;
  /** Metadaten der abgelegten Plaene; Blobs liegen in IndexedDB */
  attachments?: BaustelleAttachment[];
  /**
   * Kurzfristiger Tageseinsatz, den der Hof in der Frueh selbst aufmacht.
   * Steht in derselben Liste wie alle anderen Baustellen - nur so bleiben
   * Zuordnungen, Aufraeumen und das Umwandeln ins Buero ohne Sonderfaelle.
   * Angezeigt wird er in der eigenen Spalte statt im Streifen.
   */
  kurzfristig?: boolean;
}

/** Farbe aller kurzfristigen Einsaetze – bewusst NICHT in PRESET_COLORS, damit
 *  das Schiefergrau sofort als "keins unserer Projekte" lesbar ist. */
export const KURZFRISTIG_COLOR = '#475569';

export function isKurzfristig(b: Baustelle): boolean {
  return b.kurzfristig === true;
}

/** Gehoert in den waagrecht scrollenden Streifen der Tafel. */
export function isStreifenBaustelle(b: Baustelle): boolean {
  return b.status !== 'Archiviert' && b.kurzfristig !== true;
}

// Recurring Rules
export type RulePattern = 'weekly' | 'biweekly' | 'monthly';
export type RuleTargetPool = 'schule' | 'frei' | 'nicht_verfuegbar';

export interface RecurringRule {
  id: string;
  weekdays: number[]; // 0=Mo, 1=Di, 2=Mi, 3=Do, 4=Fr, 5=Sa
  pattern: RulePattern;
  targetPool: RuleTargetPool;
  validFrom: string;
  validUntil: string;
  description: string;
}

// Personnel
export interface Personnel {
  id: string;
  firstName: string;
  lastName: string;
  role: PersonnelRole;
  phone: string;
  notes: string;
  assignedTo: string; // baustelle id or pool id
  recurringRules: RecurringRule[];
  autoAbsent: boolean; // true if moved by automation today
  createdAt: string;
}

// Equipment (vehicles + machines)
export type EquipmentStatus = 'verfuegbar' | 'in_reparatur' | 'ausser_betrieb';

export interface Equipment {
  id: string;
  name: string;
  category: EquipmentCategory;
  resourceCategory: ResourceCategory; // 'fahrzeug' or 'maschine'
  licensePlate: string;
  notes: string;
  status: EquipmentStatus;
  assignedTo: string; // baustelle id or pool id
  createdAt: string;
  /** max. MAX_APPOINTMENTS_PER_EQUIPMENT, nach Datum aufsteigend */
  appointments?: VehicleAppointment[];
  /** Nur gesetzt, wenn ein Mensch das Symbol in der Verwaltung ueberschreibt */
  iconKey?: IconKey;
}

// Helper functions
export function getResourceCategoryFromEquipment(cat: EquipmentCategory): ResourceCategory {
  if (['Fahrzeug', 'Anhänger', 'LKW'].includes(cat)) return 'fahrzeug';
  return 'maschine';
}

export function getDefaultPoolForCategory(resCat: ResourceCategory): PoolId {
  if (resCat === 'personal') return 'verfuegbar';
  if (resCat === 'fahrzeug') return 'fuhrpark';
  return 'maschinenpark';
}

export function getPersonnelSortOrder(role: PersonnelRole): number {
  const order: Record<PersonnelRole, number> = { Bauleitung: 0, Vorarbeiter: 1, Facharbeiter: 2, Azubi: 3 };
  return order[role];
}

export function getEquipmentSortOrder(cat: EquipmentCategory): number {
  const order: Record<string, number> = {
    Fahrzeug: 10, 'Anhänger': 11, LKW: 12,
    Bagger: 20, Minibagger: 21, Radlader: 22, 'Rüttelplatte': 23, Dumper: 24, 'Sonstige Maschine': 25,
  };
  return order[cat] ?? 30;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

// Day names for rules UI
export const WEEKDAY_NAMES = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

// ─── Abo-Baustellen (Wiederkehrende Baustellen) ────────────────────────────

export interface AboBaustelle {
  id: string;
  name: string;
  adresse: string;
  auftragsnummer: string;
  /** JS weekday: 0=Sonntag, 1=Montag ... 6=Samstag */
  wochentag: number;
  /** Jede X-te Woche (1 = jede Woche, 2 = jede 2. Woche, ...) */
  rhythmus: number;
  gueltigAb: string;         // ISO date string
  gueltigBis: string | null; // null = unbegrenzt
  aktiv: boolean;
  notizen: string;
  color: string;
}

/** Duplikat-Schutz: merkt sich welche Abos heute schon erstellt wurden */
export interface AboCreatedMarker {
  aboId: string;
  datum: string; // ISO date string
}

// Weekday labels for AboBaustelle (JS convention: 1=Mo, 6=Sa, 0=So)
export const ABO_WEEKDAY_LABELS: Record<number, string> = {
  1: 'Mo', 2: 'Di', 3: 'Mi', 4: 'Do', 5: 'Fr', 6: 'Sa',
};

// ─── Snapshot / Verlauf ────────────────────────────────────────────────────
export interface SnapshotData {
  baustellen: Baustelle[];
  personnel: Personnel[];
  equipment: Equipment[];
  aboBaustellen: AboBaustelle[];
  aboCreatedMarkers: AboCreatedMarker[];
}
