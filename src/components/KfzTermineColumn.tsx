import { CalendarClock, TriangleAlert } from 'lucide-react';
import type { Equipment } from '../types';
import {
  collectUpcoming,
  formatAppointmentDate,
  formatDaysLabel,
  APPOINTMENT_WARN_DAYS,
} from '../utils/appointments';
import { getEquipmentVisual } from './resourceVisuals';

/**
 * Feste Spalte rechts neben den Baustellen: alle KFZ-Termine chronologisch.
 *
 * Bewusst als Geschwister NEBEN dem waagrecht scrollenden Streifen statt als
 * position:sticky darin. @dnd-kit misst seine Drop-Rechtecke beim Drag-Start
 * und korrigiert sie danach um den Scroll-Versatz der scrollbaren Vorfahren –
 * ein klebendes Element wandert dabei nicht mit, sein Rechteck driftet also
 * weg von der Stelle, an der es gezeichnet wird. Als Geschwister gibt es
 * diese Beruehrung gar nicht erst, und die Spalte verdeckt keine Baustelle.
 */
export function KfzTermineColumn({ equipment }: { equipment: Equipment[] }) {
  const upcoming = collectUpcoming(equipment);

  return (
    <div
      style={{
        flex: '0 0 230px',
        alignSelf: 'stretch',
        borderRadius: 12,
        border: '2px solid #e5e7eb',
        backgroundColor: '#fff',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          backgroundColor: '#334155',
          color: '#fff',
          padding: '8px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: 0.3,
        }}
      >
        <CalendarClock size={14} />
        <span style={{ flex: 1 }}>KFZ-Termine</span>
        {upcoming.length > 0 && (
          <span
            style={{
              fontSize: 10,
              backgroundColor: 'rgba(255,255,255,0.22)',
              borderRadius: 10,
              padding: '1px 7px',
            }}
          >
            {upcoming.length}
          </span>
        )}
      </div>

      <div style={{ padding: 8, flex: 1, overflowY: 'auto', maxHeight: 520 }}>
        {upcoming.length === 0 && (
          <div
            style={{
              color: '#9ca3af',
              fontSize: 11,
              textAlign: 'center',
              padding: '16px 4px',
              lineHeight: 1.5,
            }}
          >
            Keine Termine hinterlegt.
            <br />
            Anzulegen in der Verwaltung unter „Maschinen &amp; Fahrzeuge“.
          </div>
        )}

        {upcoming.map((u) => {
          const warn = u.severity !== 'normal';
          const visual = getEquipmentVisual(
            equipment.find((e) => e.id === u.equipmentId)!.category,
            u.equipmentName,
            equipment.find((e) => e.id === u.equipmentId)!.iconKey
          );
          const Icon = visual.Icon;
          return (
            <div
              key={u.equipmentId + ':' + u.appointment.id}
              title={[u.equipmentName, u.appointment.label, formatDaysLabel(u.days)]
                .filter(Boolean)
                .join(' · ')}
              style={{
                border: warn ? '1px solid #fca5a5' : '1px solid #e5e7eb',
                backgroundColor: warn ? '#fef2f2' : '#f8fafc',
                borderRadius: 7,
                padding: '5px 7px',
                marginBottom: 5,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 1 }}>
                <Icon size={12} color={warn ? '#dc2626' : visual.iconColor} />
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: 11,
                    fontWeight: warn ? 700 : 600,
                    color: warn ? '#b91c1c' : '#334155',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {u.equipmentName}
                </span>
                {warn && <TriangleAlert size={11} style={{ color: '#dc2626', flexShrink: 0 }} />}
              </div>

              {u.licensePlate && (
                <div
                  style={{
                    fontSize: 10,
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                    letterSpacing: 0.3,
                    color: warn ? '#b91c1c' : '#64748b',
                    marginBottom: 1,
                  }}
                >
                  {u.licensePlate}
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 5,
                  fontSize: 11,
                  fontWeight: warn ? 700 : 500,
                  color: warn ? '#b91c1c' : '#475569',
                }}
              >
                <span>{u.appointment.type}</span>
                <span>{formatAppointmentDate(u.appointment.date)}</span>
              </div>

              <div
                style={{
                  fontSize: 10,
                  fontWeight: warn ? 700 : 400,
                  color: warn ? '#dc2626' : '#94a3b8',
                }}
              >
                {formatDaysLabel(u.days)}
                {u.appointment.label ? ' · ' + u.appointment.label : ''}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          borderTop: '1px solid #e5e7eb',
          padding: '4px 8px',
          fontSize: 10,
          color: '#94a3b8',
          textAlign: 'center',
        }}
      >
        Rot ab {APPOINTMENT_WARN_DAYS} Tagen vorher
      </div>
    </div>
  );
}
