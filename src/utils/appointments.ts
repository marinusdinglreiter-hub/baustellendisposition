/**
 * KFZ-Termine: Faelligkeit, Sortierung, Aufbereitung fuer die Tafel.
 *
 * Eine Konstante, eine Schwelle – benutzt von EquipmentAdmin,
 * KfzTermineColumn, cardData und der Hallenansicht.
 */
import type { Equipment, VehicleAppointment } from '../types';

export const APPOINTMENT_WARN_DAYS = 14;

export type AppointmentSeverity = 'overdue' | 'soon' | 'normal';

/** Heute, auf lokale Mitternacht normalisiert. */
export function startOfToday(now: Date = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Ganze Tage bis zum Termin. Beide Seiten werden auf lokale Mitternacht
 * normalisiert – mit rohen Date.now()-Differenzen gaebe es einen Off-by-one
 * fuer alle, die um 07:00 oder um 23:00 auf die Tafel schauen, und an der
 * 14-Tage-Grenze hiesse das: die rote Warnung kommt einen Tag zu spaet.
 */
export function daysUntil(dateIso: string, today: Date = new Date()): number {
  const target = new Date(dateIso + 'T00:00:00');
  if (Number.isNaN(target.getTime())) return Number.POSITIVE_INFINITY;
  const diff = target.getTime() - startOfToday(today).getTime();
  return Math.round(diff / 86_400_000);
}

export function appointmentSeverity(
  a: VehicleAppointment,
  today: Date = new Date()
): AppointmentSeverity {
  const d = daysUntil(a.date, today);
  if (d < 0) return 'overdue';
  if (d <= APPOINTMENT_WARN_DAYS) return 'soon';
  return 'normal';
}

export interface UpcomingAppointment {
  equipmentId: string;
  equipmentName: string;
  licensePlate: string;
  appointment: VehicleAppointment;
  days: number;
  severity: AppointmentSeverity;
}

/**
 * Flacht alle Geraete x Termine auf eine chronologisch sortierte Liste ab.
 * Ueberfaellige Termine haben die frueheren Daten und stehen dadurch von
 * selbst oben – kein Sonderfall noetig.
 */
export function collectUpcoming(
  equipment: Equipment[],
  opts?: { maxPastDays?: number | null; today?: Date }
): UpcomingAppointment[] {
  const today = opts?.today ?? new Date();
  const maxPastDays = opts?.maxPastDays ?? null;
  const out: UpcomingAppointment[] = [];

  for (const e of equipment) {
    for (const a of e.appointments ?? []) {
      const days = daysUntil(a.date, today);
      if (maxPastDays !== null && days < -maxPastDays) continue;
      out.push({
        equipmentId: e.id,
        equipmentName: e.name,
        licensePlate: e.licensePlate ?? '',
        appointment: a,
        days,
        severity: appointmentSeverity(a, today),
      });
    }
  }

  return out.sort((x, y) => {
    if (x.appointment.date !== y.appointment.date) {
      return x.appointment.date < y.appointment.date ? -1 : 1;
    }
    return x.equipmentName.localeCompare(y.equipmentName, 'de');
  });
}

/** Der dringlichste Termin eines Geraets, oder null. */
export function nextAppointment(
  e: Equipment,
  today: Date = new Date()
): { appointment: VehicleAppointment; days: number; severity: AppointmentSeverity } | null {
  const list = e.appointments ?? [];
  if (list.length === 0) return null;
  // appointments sind durch normalizeEquipmentList aufsteigend sortiert
  const a = list[0];
  return { appointment: a, days: daysUntil(a.date, today), severity: appointmentSeverity(a, today) };
}

export function formatAppointmentDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** 'heute' / 'morgen' / 'in 9 Tagen' / 'überfällig seit 3 Tagen' */
export function formatDaysLabel(days: number): string {
  if (days === 0) return 'heute';
  if (days === 1) return 'morgen';
  if (days < 0) {
    const n = Math.abs(days);
    return `überfällig seit ${n} ${n === 1 ? 'Tag' : 'Tagen'}`;
  }
  return `in ${days} Tagen`;
}

export function todayIso(now: Date = new Date()): string {
  const d = startOfToday(now);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
