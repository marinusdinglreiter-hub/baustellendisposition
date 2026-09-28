import { useState } from 'react';
import { Lock, Check } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useAdminLock } from '../../utils/adminLock';
import { PersonnelAdmin } from './PersonnelAdmin';
import { EquipmentAdmin } from './EquipmentAdmin';
import { BaustellenAdmin } from './BaustellenAdmin';
import { AboBaustellenAdmin } from './AboBaustellenAdmin';
import { HistoryAdmin } from './HistoryAdmin';

const tabs = [
  { key: 'personal' as const, label: 'Personal' },
  { key: 'equipment' as const, label: 'Maschinen & Fahrzeuge' },
  { key: 'baustellen' as const, label: 'Baustellen' },
  { key: 'abo' as const, label: '🔁 Wiederkehrend' },
  { key: 'verlauf' as const, label: '💾 Verlauf' },
];

export function AdminView() {
  const { adminTab, setAdminTab } = useStore();

  return (
    <div style={{ padding: '16px 24px 32px' }}>
      {/* Sub-tabs */}
      <div
        style={{
          display: 'flex',
          gap: 0,
          borderBottom: '2px solid #e5e7eb',
          marginBottom: 20,
        }}
      >
        {tabs.map((tab) => {
          const isActive = adminTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setAdminTab(tab.key)}
              style={{
                padding: '10px 20px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#2563eb' : '#6b7280',
                borderBottom: isActive ? '2px solid #2563eb' : '2px solid transparent',
                marginBottom: -2,
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {adminTab === 'personal' && <PersonnelAdmin />}
      {adminTab === 'equipment' && <EquipmentAdmin />}
      {adminTab === 'baustellen' && <BaustellenAdmin />}
      {adminTab === 'abo' && <AboBaustellenAdmin />}
      {adminTab === 'verlauf' && <HistoryAdmin />}

      <AdminLockFooter />
    </div>
  );
}

/**
 * PIN aendern und Verwaltung sperren.
 *
 * Bewusst auch hier und nicht nur als Symbol in der Kopfzeile – das dort
 * uebersieht man leicht.
 */
function AdminLockFooter() {
  const { lock } = useAdminLock();
  const adminPin = useStore((s) => s.adminPin);
  const setAdminPin = useStore((s) => s.setAdminPin);
  const setView = useStore((s) => s.setView);

  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [saved, setSaved] = useState(false);

  function save() {
    const pin = value.trim();
    if (pin.length < 4) return;
    setAdminPin(pin);
    setEditing(false);
    setValue('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div
      style={{
        marginTop: 28,
        paddingTop: 16,
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
      }}
    >
      <button
        onClick={() => {
          lock();
          setView('disposition');
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '9px 16px',
          border: 'none',
          borderRadius: 7,
          backgroundColor: '#1e293b',
          color: '#fff',
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        <Lock size={15} />
        Verwaltung sperren
      </button>

      {editing ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="text"
            inputMode="numeric"
            autoFocus
            maxLength={8}
            placeholder="Neue PIN"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 14,
              width: 130,
              outline: 'none',
              letterSpacing: 2,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            }}
          />
          <button
            onClick={save}
            disabled={value.trim().length < 4}
            style={{
              padding: '8px 14px',
              border: 'none',
              borderRadius: 6,
              backgroundColor: value.trim().length < 4 ? '#94a3b8' : '#2563eb',
              color: '#fff',
              cursor: value.trim().length < 4 ? 'default' : 'pointer',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Speichern
          </button>
          <button
            onClick={() => {
              setEditing(false);
              setValue('');
            }}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              backgroundColor: '#fff',
              color: '#475569',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Abbrechen
          </button>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>mindestens 4 Zeichen</span>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          style={{
            padding: '9px 14px',
            border: '1px solid #d1d5db',
            borderRadius: 7,
            backgroundColor: '#fff',
            color: '#475569',
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          PIN ändern (aktuell {adminPin.length} Zeichen)
        </button>
      )}

      {saved && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 13,
            color: '#059669',
            fontWeight: 600,
          }}
        >
          <Check size={14} />
          PIN geändert
        </span>
      )}

      <span style={{ fontSize: 12, color: '#94a3b8', flex: 1, minWidth: 260, lineHeight: 1.5 }}>
        Die PIN gilt pro Gerät und wandert nicht über die Cloud-Sync-Datei mit.
        Sie schützt vor versehentlichen Eingriffen, nicht vor jemandem, der es
        wirklich darauf anlegt.
      </span>
    </div>
  );
}
