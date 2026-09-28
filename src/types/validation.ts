/**
 * Zentrale Validierungsregeln für Drag & Drop Zuordnungen.
 * Alle Regeln an EINER Stelle gepflegt.
 */

import type { PersonnelRole, EquipmentCategory, PoolId, ResourceCategory } from './index';

// ─── Welche Pools sind für welchen Ressourcentyp erlaubt? ───

const PERSONNEL_POOL_RULES: Record<PersonnelRole, PoolId[]> = {
  Bauleitung: ['verfuegbar', 'krank', 'frei', 'nicht_verfuegbar'],
  Vorarbeiter: ['verfuegbar', 'krank', 'frei', 'nicht_verfuegbar'],
  Facharbeiter: ['verfuegbar', 'krank', 'frei', 'nicht_verfuegbar'],
  Azubi: ['verfuegbar', 'krank', 'frei', 'schule', 'nicht_verfuegbar'],
};

const EQUIPMENT_POOL_RULES: Record<'fahrzeug' | 'maschine', PoolId[]> = {
  fahrzeug: ['fuhrpark', 'in_reparatur', 'ausser_betrieb'],
  maschine: ['maschinenpark', 'in_reparatur', 'ausser_betrieb'],
};

// ─── Lesbare Labels für Fehlermeldungen ───

const POOL_LABELS: Record<string, string> = {
  verfuegbar: 'Verfügbares Personal',
  krank: 'Krankenstand',
  schule: 'Schule / Ausbildung',
  frei: 'Frei / Urlaub',
  nicht_verfuegbar: 'Nicht verfügbar',
  fuhrpark: 'Fuhrpark',
  maschinenpark: 'Maschinenpark',
  in_reparatur: 'In Reparatur',
  ausser_betrieb: 'Außer Betrieb',
};

// ─── Alle bekannten Pool-IDs ───

const ALL_POOL_IDS: PoolId[] = [
  'verfuegbar', 'krank', 'schule', 'frei', 'nicht_verfuegbar',
  'fuhrpark', 'maschinenpark', 'in_reparatur', 'ausser_betrieb',
];

export function isPoolId(id: string): id is PoolId {
  return ALL_POOL_IDS.includes(id as PoolId);
}

// ─── Haupt-Validierungsfunktion ───

export interface DropValidationResult {
  valid: boolean;
  reason: string; // leer wenn valid
}

/**
 * Prüft ob ein Drop gültig ist.
 * @param kind - 'personnel' oder 'equipment'
 * @param role - PersonnelRole (wenn kind='personnel')
 * @param equipCategory - EquipmentCategory (wenn kind='equipment')
 * @param equipResCategory - 'fahrzeug' | 'maschine' (wenn kind='equipment')
 * @param targetId - Ziel-ID (Pool-ID oder Baustellen-ID)
 */
export function validateDrop(
  kind: 'personnel' | 'equipment',
  role: PersonnelRole | null,
  equipCategory: EquipmentCategory | null,
  equipResCategory: ResourceCategory | null,
  targetId: string
): DropValidationResult {
  // Baustellen und Aufräumen sind immer erlaubt
  if (targetId === 'aufraumen') {
    return { valid: true, reason: '' };
  }

  // Wenn targetId kein Pool ist, ist es eine Baustelle → immer erlaubt
  if (!isPoolId(targetId)) {
    return { valid: true, reason: '' };
  }

  const poolLabel = POOL_LABELS[targetId] || targetId;

  if (kind === 'personnel') {
    const r = role!;
    const allowed = PERSONNEL_POOL_RULES[r];

    if (!allowed) {
      return { valid: false, reason: `Unbekannte Rolle: ${r}` };
    }

    if (!allowed.includes(targetId as PoolId)) {
      // Spezifische Fehlermeldungen
      if (targetId === 'schule' && r !== 'Azubi') {
        return {
          valid: false,
          reason: `Nur Azubis können in "${poolLabel}" zugeordnet werden. ${r} ist nicht erlaubt.`,
        };
      }
      if (['fuhrpark', 'maschinenpark', 'in_reparatur', 'ausser_betrieb'].includes(targetId)) {
        return {
          valid: false,
          reason: `Personen können nicht in "${poolLabel}" zugeordnet werden. Nur Fahrzeuge/Maschinen sind dort erlaubt.`,
        };
      }
      return {
        valid: false,
        reason: `${r} kann nicht in "${poolLabel}" zugeordnet werden.`,
      };
    }

    return { valid: true, reason: '' };
  }

  // Equipment
  const resCat = equipResCategory as 'fahrzeug' | 'maschine';
  const allowed = EQUIPMENT_POOL_RULES[resCat];
  const catName = equipCategory || 'Gerät';

  if (!allowed) {
    return { valid: false, reason: `Unbekannte Gerätekategorie.` };
  }

  if (!allowed.includes(targetId as PoolId)) {
    if (['verfuegbar', 'krank', 'schule', 'frei', 'nicht_verfuegbar'].includes(targetId)) {
      return {
        valid: false,
        reason: `"${catName}" kann nicht in "${poolLabel}" zugeordnet werden. Nur Personen sind dort erlaubt.`,
      };
    }
    if (targetId === 'fuhrpark' && resCat === 'maschine') {
      return {
        valid: false,
        reason: `"${catName}" ist eine Maschine und gehört nicht in den Fuhrpark. Bitte "Maschinenpark" verwenden.`,
      };
    }
    if (targetId === 'maschinenpark' && resCat === 'fahrzeug') {
      return {
        valid: false,
        reason: `"${catName}" ist ein Fahrzeug und gehört nicht in den Maschinenpark. Bitte "Fuhrpark" verwenden.`,
      };
    }
    return {
      valid: false,
      reason: `"${catName}" kann nicht in "${poolLabel}" zugeordnet werden.`,
    };
  }

  return { valid: true, reason: '' };
}

/**
 * Schnell-Check ob ein Drop gültig wäre (für visuelles Feedback während Drag).
 * Gleiche Logik wie validateDrop, aber nur boolean zurück.
 */
export function isDropAllowed(
  kind: 'personnel' | 'equipment',
  role: PersonnelRole | null,
  equipCategory: EquipmentCategory | null,
  equipResCategory: ResourceCategory | null,
  targetId: string
): boolean {
  return validateDrop(kind, role, equipCategory, equipResCategory, targetId).valid;
}

/**
 * Prüft bestehende Zuordnungen auf Validität.
 * Gibt eine Liste ungültiger Zuordnungen zurück.
 */
export interface InvalidAssignment {
  resourceId: string;
  resourceName: string;
  currentPool: string;
  reason: string;
}

export function findInvalidPersonnelAssignments(
  personnel: { id: string; firstName: string; lastName: string; role: PersonnelRole; assignedTo: string }[],
  baustelleIds: string[]
): InvalidAssignment[] {
  const invalid: InvalidAssignment[] = [];

  for (const p of personnel) {
    // Wenn Baustelle → ok
    if (baustelleIds.includes(p.assignedTo)) continue;
    // Wenn kein Pool → unbekannt
    if (!isPoolId(p.assignedTo)) {
      invalid.push({
        resourceId: p.id,
        resourceName: `${p.lastName}, ${p.firstName}`,
        currentPool: p.assignedTo,
        reason: `Unbekannte Zuordnung: "${p.assignedTo}"`,
      });
      continue;
    }

    const result = validateDrop('personnel', p.role, null, null, p.assignedTo);
    if (!result.valid) {
      invalid.push({
        resourceId: p.id,
        resourceName: `${p.lastName}, ${p.firstName}`,
        currentPool: POOL_LABELS[p.assignedTo] || p.assignedTo,
        reason: result.reason,
      });
    }
  }

  return invalid;
}

export function findInvalidEquipmentAssignments(
  equipment: { id: string; name: string; category: EquipmentCategory; resourceCategory: ResourceCategory; assignedTo: string }[],
  baustelleIds: string[]
): InvalidAssignment[] {
  const invalid: InvalidAssignment[] = [];

  for (const e of equipment) {
    if (baustelleIds.includes(e.assignedTo)) continue;
    if (!isPoolId(e.assignedTo)) {
      invalid.push({
        resourceId: e.id,
        resourceName: e.name,
        currentPool: e.assignedTo,
        reason: `Unbekannte Zuordnung: "${e.assignedTo}"`,
      });
      continue;
    }

    const result = validateDrop('equipment', null, e.category, e.resourceCategory, e.assignedTo);
    if (!result.valid) {
      invalid.push({
        resourceId: e.id,
        resourceName: e.name,
        currentPool: POOL_LABELS[e.assignedTo] || e.assignedTo,
        reason: result.reason,
      });
    }
  }

  return invalid;
}
