import type { Baustelle, Personnel, Equipment } from '../../types';
import type { TVSettings } from '../../types/tvSettings';
import { getPersonnelSortOrder, getEquipmentSortOrder } from '../../types';
import { Paperclip } from 'lucide-react';

interface Props {
  baustelle: Baustelle;
  personnel: Personnel[];
  equipment: Equipment[];
  isFlashing: boolean;
  settings: TVSettings;
  scale: number;
}

export function TVBaustelleBlock({
  baustelle,
  personnel,
  equipment,
  isFlashing,
  settings,
  scale,
}: Props) {
  const { mitarbeiterRolle, kennzeichen, maschinenbezeichnung, notizen, dateien } =
    settings.anzeige;
  const { trennlinien } = settings.darstellung;

  const sortedPersonnel = [...personnel].sort(
    (a, b) => getPersonnelSortOrder(a.role) - getPersonnelSortOrder(b.role)
  );
  const sortedEquipment = [...equipment].sort(
    (a, b) => getEquipmentSortOrder(a.category) - getEquipmentSortOrder(b.category)
  );

  const borderColor = trennlinien ? 'rgba(255,255,255,0.13)' : 'transparent';

  return (
    <div
      style={{
        border: `1px solid ${borderColor}`,
        borderRadius: 10,
        padding: `${scale * 14}px ${scale * 20}px`,
        display: 'flex',
        flexDirection: 'column',
        gap: scale * 8,
        overflow: 'hidden',
        // Flash: CSS-Animation via inline style when isFlashing is true
        animation: isFlashing ? 'tv-flash 2.5s ease-out forwards' : 'none',
      }}
    >
      {/* ── Baustellenname ── */}
      <div
        style={{
          fontSize: scale * 1.45 + 'rem',
          fontWeight: 800,
          letterSpacing: 0.8,
          lineHeight: 1.15,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          textTransform: 'uppercase',
        }}
      >
        {baustelle.name}
      </div>

      {/* Adresse */}
      {baustelle.address && (
        <div
          style={{
            fontSize: scale * 0.78 + 'rem',
            opacity: 0.45,
            marginTop: -(scale * 5),
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {baustelle.address}
        </div>
      )}

      {/* ── Personal ── */}
      {sortedPersonnel.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: scale * 2 }}>
          <div
            style={{
              fontSize: scale * 0.72 + 'rem',
              fontWeight: 700,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              opacity: 0.4,
              marginBottom: scale * 2,
            }}
          >
            Personal
          </div>
          {sortedPersonnel.map((p) => (
            <div
              key={p.id}
              style={{
                fontSize: scale * 1.08 + 'rem',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'baseline',
                gap: scale * 6,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
            >
              <span
                style={{
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  fontWeight: p.role === 'Bauleitung' || p.role === 'Vorarbeiter' ? 700 : 500,
                }}
              >
                {p.lastName}, {p.firstName}
              </span>
              {mitarbeiterRolle && (
                <span
                  style={{
                    fontSize: scale * 0.75 + 'rem',
                    opacity: 0.45,
                    flexShrink: 0,
                    fontWeight: 400,
                  }}
                >
                  {p.role}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Trennlinie ── */}
      {sortedPersonnel.length > 0 && sortedEquipment.length > 0 && (
        <div
          style={{
            height: 1,
            backgroundColor: 'rgba(255,255,255,0.09)',
          }}
        />
      )}

      {/* ── Fahrzeuge / Maschinen ── */}
      {sortedEquipment.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: scale * 2 }}>
          <div
            style={{
              fontSize: scale * 0.72 + 'rem',
              fontWeight: 700,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              opacity: 0.4,
              marginBottom: scale * 2,
            }}
          >
            Fahrzeuge / Maschinen
          </div>
          {sortedEquipment.map((e) => (
            <div
              key={e.id}
              style={{
                fontSize: scale * 1.0 + 'rem',
                fontWeight: 400,
                display: 'flex',
                alignItems: 'baseline',
                gap: scale * 6,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                opacity: 0.8,
              }}
            >
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {maschinenbezeichnung ? e.name : e.name.split(' ').slice(0, 2).join(' ')}
              </span>
              {kennzeichen && e.licensePlate && (
                <span
                  style={{
                    fontSize: scale * 0.75 + 'rem',
                    opacity: 0.5,
                    fontFamily: 'monospace',
                    flexShrink: 0,
                    letterSpacing: 0.5,
                  }}
                >
                  {e.licensePlate}
                </span>
              )}
              <span
                style={{
                  fontSize: scale * 0.72 + 'rem',
                  opacity: 0.35,
                  flexShrink: 0,
                  fontWeight: 400,
                }}
              >
                {e.category}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Leerstand */}
      {sortedPersonnel.length === 0 && sortedEquipment.length === 0 && (
        <div
          style={{
            fontSize: scale * 0.85 + 'rem',
            opacity: 0.25,
            fontStyle: 'italic',
          }}
        >
          Keine Ressourcen zugewiesen
        </div>
      )}

      {/* Notizen */}
      {notizen && baustelle.notes.trim() && (
        <div
          style={{
            marginTop: scale * 4,
            paddingTop: scale * 6,
            borderTop: `1px solid ${borderColor}`,
            fontSize: scale * 0.82 + 'rem',
            lineHeight: 1.4,
            opacity: 0.72,
            whiteSpace: 'pre-wrap',
            overflow: 'hidden',
          }}
        >
          {baustelle.notes}
        </div>
      )}

      {/* Abgelegte Pläne */}
      {dateien && (baustelle.attachments?.length ?? 0) > 0 && (
        <div
          style={{
            marginTop: scale * 2,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: scale * 6,
            fontSize: scale * 0.74 + 'rem',
            opacity: 0.55,
          }}
        >
          <Paperclip size={scale * 12} style={{ flexShrink: 0 }} />
          {baustelle.attachments!.map((a) => (
            <span
              key={a.id}
              style={{
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {a.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
