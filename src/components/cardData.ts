/**
 * Erzeugung der Karten-Projektion fuer die Tafel.
 *
 * BaustelleColumn und PoolSection hatten hiervon zwei identische Kopien.
 * Alles, was eine Karte ueber ihre Ressource wissen muss (Kennzeichen,
 * Symbol-Override, Termin-Warnung), wird genau hier zusammengetragen.
 */
import type { Personnel, Equipment } from '../types';
import { getPersonnelSortOrder, getEquipmentSortOrder } from '../types';
import type { CardData } from './ResourceCard';
import { nextAppointment } from '../utils/appointments';

export function toPersonnelCard(p: Personnel): CardData {
  return {
    kind: 'personnel',
    id: p.id,
    displayName: `${p.lastName}, ${p.firstName}`,
    role: p.role,
    autoAbsent: p.autoAbsent,
  };
}

export function toEquipmentCard(e: Equipment, today?: Date): CardData {
  const next = nextAppointment(e, today);
  return {
    kind: 'equipment',
    id: e.id,
    displayName: e.name,
    category: e.category,
    licensePlate: e.licensePlate || undefined,
    iconKey: e.iconKey,
    appointmentWarning:
      next && next.severity !== 'normal' ? next.severity : undefined,
  };
}

export function sortPersonnel(personnel: Personnel[]): Personnel[] {
  return [...personnel].sort(
    (a, b) => getPersonnelSortOrder(a.role) - getPersonnelSortOrder(b.role)
  );
}

export function sortEquipment(equipment: Equipment[]): Equipment[] {
  return [...equipment].sort(
    (a, b) => getEquipmentSortOrder(a.category) - getEquipmentSortOrder(b.category)
  );
}

/** Personal zuerst (nach Rolle), dann Geraete (nach Kategorie). */
export function buildCards(
  personnel: Personnel[],
  equipment: Equipment[],
  today?: Date
): CardData[] {
  return [
    ...sortPersonnel(personnel).map(toPersonnelCard),
    ...sortEquipment(equipment).map((e) => toEquipmentCard(e, today)),
  ];
}
