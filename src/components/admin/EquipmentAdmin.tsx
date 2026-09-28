import { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import type {
  Equipment, EquipmentCategory, EquipmentStatus, ResourceCategory, IconKey,
  VehicleAppointment, AppointmentType,
} from '../../types';
import { APPOINTMENT_TYPES, MAX_APPOINTMENTS_PER_EQUIPMENT } from '../../types';
import {
  appointmentSeverity, formatAppointmentDate, formatDaysLabel, daysUntil, todayIso,
} from '../../utils/appointments';
import {
  getEquipmentVisual,
  EQUIPMENT_ICON_KEYS,
  ICON_KEY_LABELS,
} from '../resourceVisuals';
import { generateId, getResourceCategoryFromEquipment } from '../../types';
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Search, RotateCcw, X, CalendarPlus, TriangleAlert } from 'lucide-react';

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: 14,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  backgroundColor: '#fff',
};

const btnPrimary: React.CSSProperties = {
  padding: '8px 16px',
  backgroundColor: '#2563eb',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  fontSize: 14,
  cursor: 'pointer',
  fontWeight: 600,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};

const btnDanger: React.CSSProperties = {
  padding: '6px 12px',
  backgroundColor: '#dc2626',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  fontSize: 13,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
};

const btnSecondary: React.CSSProperties = {
  padding: '6px 12px',
  backgroundColor: '#fff',
  color: '#374151',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: 13,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
};

const filterChipStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '4px 10px',
  backgroundColor: '#eff6ff',
  color: '#2563eb',
  borderRadius: 20,
  fontSize: 12,
  fontWeight: 600,
  border: '1px solid #bfdbfe',
  cursor: 'default',
};

const SEVERITY_STYLE = {
  overdue: { bg: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' },
  soon: { bg: '#fef3c7', color: '#b45309', border: '1px solid #fcd34d' },
  normal: { bg: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' },
} as const;

/** Termin-Chips in der Anzeigezeile */
function AppointmentChips({ appointments }: { appointments: VehicleAppointment[] }) {
  if (appointments.length === 0) {
    return <span style={{ fontSize: 13, color: '#9ca3af' }}>-</span>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {appointments.map((a) => {
        const sev = appointmentSeverity(a);
        const st = SEVERITY_STYLE[sev];
        return (
          <span
            key={a.id}
            title={[a.label, formatDaysLabel(daysUntil(a.date))].filter(Boolean).join(' · ')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 7px',
              borderRadius: 4,
              fontSize: 12,
              fontWeight: sev === 'normal' ? 500 : 700,
              backgroundColor: st.bg,
              color: st.color,
              border: st.border,
              whiteSpace: 'nowrap',
              width: 'fit-content',
            }}
          >
            {sev === 'overdue' && <TriangleAlert size={11} />}
            {a.type} {formatAppointmentDate(a.date)}
          </span>
        );
      })}
    </div>
  );
}

/** Zeigt, welches Symbol auf der Tafel tatsaechlich erscheinen wird. */
function EquipmentIconPreview({
  category,
  name,
  iconKey,
}: {
  category: EquipmentCategory;
  name: string;
  iconKey?: IconKey;
}) {
  const v = getEquipmentVisual(category, name, iconKey);
  const Icon = v.Icon;
  return (
    <span
      title={iconKey ? 'Symbol manuell gesetzt' : 'Symbol automatisch erkannt'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 24,
        height: 24,
        borderRadius: 5,
        flexShrink: 0,
        backgroundColor: v.bg,
        border: v.border,
      }}
    >
      <Icon size={14} color={v.iconColor} />
    </span>
  );
}

const categories: EquipmentCategory[] = [
  'Fahrzeug', 'Anhänger', 'LKW',
  'Bagger', 'Minibagger', 'Radlader', 'Rüttelplatte', 'Dumper', 'Sonstige Maschine',
];

interface FormData {
  name: string;
  category: EquipmentCategory;
  licensePlate: string;
  notes: string;
  status: EquipmentStatus;
  /** '' = automatisch aus Kategorie und Bezeichnung ableiten */
  iconKey: IconKey | '';
  appointments: VehicleAppointment[];
}

const emptyForm: FormData = {
  name: '',
  category: 'Fahrzeug',
  licensePlate: '',
  notes: '',
  status: 'verfuegbar',
  iconKey: '',
  appointments: [],
};

type SortField = 'name' | 'category' | 'assignedTo' | 'status';
type SortDir = 'asc' | 'desc';

const poolLabels: Record<string, string> = {
  fuhrpark: 'Fuhrpark',
  maschinenpark: 'Maschinenpark',
  in_reparatur: 'In Reparatur',
  ausser_betrieb: 'Außer Betrieb',
};

function getAssignmentLabel(assignedTo: string, baustellen: { id: string; name: string }[]): string {
  if (poolLabels[assignedTo]) return poolLabels[assignedTo];
  const bs = baustellen.find((b) => b.id === assignedTo);
  return bs ? bs.name : assignedTo;
}

function getStatusLabel(status: EquipmentStatus): string {
  const labels: Record<EquipmentStatus, string> = {
    verfuegbar: 'Verfügbar',
    in_reparatur: 'In Reparatur',
    ausser_betrieb: 'Außer Betrieb',
  };
  return labels[status];
}

function getStatusColor(status: EquipmentStatus): { bg: string; color: string } {
  if (status === 'in_reparatur') return { bg: '#fef2f2', color: '#dc2626' };
  if (status === 'ausser_betrieb') return { bg: '#f3f4f6', color: '#6b7280' };
  return { bg: '#f0fdf4', color: '#16a34a' };
}

const statusOrder: Record<EquipmentStatus, number> = { verfuegbar: 0, in_reparatur: 1, ausser_betrieb: 2 };

export function EquipmentAdmin() {
  const { equipment, baustellen, addEquipment, updateEquipment, removeEquipment } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);

  // Sort state
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Filter state
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterPool, setFilterPool] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterAssignment, setFilterAssignment] = useState<string>('');
  const [searchText, setSearchText] = useState('');

  const activeBaustellen = baustellen.filter((b) => b.status !== 'Archiviert');

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  function renderSortArrow(field: SortField) {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
  }

  const filtered = useMemo(() => {
    let result = [...equipment];

    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.licensePlate.toLowerCase().includes(q)
      );
    }

    if (filterCategory) {
      result = result.filter((e) => e.category === filterCategory);
    }

    if (filterPool) {
      result = result.filter((e) => e.resourceCategory === filterPool);
    }

    if (filterStatus) {
      result = result.filter((e) => e.status === filterStatus);
    }

    if (filterAssignment) {
      if (filterAssignment === '__unassigned') {
        result = result.filter((e) => ['fuhrpark', 'maschinenpark', 'in_reparatur', 'ausser_betrieb'].includes(e.assignedTo));
      } else {
        result = result.filter((e) => e.assignedTo === filterAssignment);
      }
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'category':
          cmp = a.category.localeCompare(b.category);
          break;
        case 'assignedTo': {
          const la = getAssignmentLabel(a.assignedTo, baustellen);
          const lb = getAssignmentLabel(b.assignedTo, baustellen);
          cmp = la.localeCompare(lb);
          break;
        }
        case 'status':
          cmp = statusOrder[a.status] - statusOrder[b.status];
          break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [equipment, searchText, filterCategory, filterPool, filterStatus, filterAssignment, sortField, sortDir, baustellen]);

  const hasActiveFilters = filterCategory !== '' || filterPool !== '' || filterStatus !== '' || filterAssignment !== '' || searchText.trim() !== '';

  function resetFilters() {
    setFilterCategory('');
    setFilterPool('');
    setFilterStatus('');
    setFilterAssignment('');
    setSearchText('');
  }

  const activeFilters: { label: string; onRemove: () => void }[] = [];
  if (filterCategory) activeFilters.push({ label: `Kategorie: ${filterCategory}`, onRemove: () => setFilterCategory('') });
  if (filterPool) activeFilters.push({ label: `Pool: ${filterPool === 'fahrzeug' ? 'Fuhrpark' : 'Maschinenpark'}`, onRemove: () => setFilterPool('') });
  if (filterStatus) activeFilters.push({ label: `Status: ${getStatusLabel(filterStatus as EquipmentStatus)}`, onRemove: () => setFilterStatus('') });
  if (filterAssignment) {
    const label = filterAssignment === '__unassigned' ? 'Nicht zugeordnet' : getAssignmentLabel(filterAssignment, baustellen);
    activeFilters.push({ label: `Zuordnung: ${label}`, onRemove: () => setFilterAssignment('') });
  }
  if (searchText.trim()) activeFilters.push({ label: `Suche: "${searchText}"`, onRemove: () => setSearchText('') });

  function handleAdd() {
    setShowForm(true);
    setEditingId(null);
    setFormData(emptyForm);
  }

  function handleEdit(e: Equipment) {
    setEditingId(e.id);
    setShowForm(false);
    setFormData({
      name: e.name,
      category: e.category,
      licensePlate: e.licensePlate,
      notes: e.notes,
      status: e.status,
      iconKey: e.iconKey ?? '',
      appointments: (e.appointments ?? []).map((a) => ({ ...a })),
    });
  }

  function handleSave() {
    if (!formData.name.trim()) return;
    const resCat: ResourceCategory = getResourceCategoryFromEquipment(formData.category);
    let assignedTo: string;
    if (formData.status === 'in_reparatur') {
      assignedTo = 'in_reparatur';
    } else if (formData.status === 'ausser_betrieb') {
      assignedTo = 'ausser_betrieb';
    } else {
      assignedTo = resCat === 'fahrzeug' ? 'fuhrpark' : 'maschinenpark';
    }

    if (editingId) {
      const existing = equipment.find((e) => e.id === editingId);
      const updates: Partial<Equipment> = {
        name: formData.name,
        category: formData.category,
        resourceCategory: resCat,
        licensePlate: formData.licensePlate,
        notes: formData.notes,
        status: formData.status,
        iconKey: formData.iconKey || undefined,
        appointments: formData.appointments,
      };
      if (existing && existing.status !== formData.status) {
        updates.assignedTo = assignedTo;
      }
      updateEquipment(editingId, updates);
      setEditingId(null);
    } else {
      addEquipment({
        id: generateId(),
        name: formData.name,
        category: formData.category,
        resourceCategory: resCat,
        licensePlate: formData.licensePlate,
        notes: formData.notes,
        status: formData.status,
        iconKey: formData.iconKey || undefined,
        appointments: formData.appointments,
        assignedTo,
        createdAt: new Date().toISOString().split('T')[0],
      });
      setShowForm(false);
    }
    setFormData(emptyForm);
  }

  function handleDelete(id: string) {
    if (window.confirm('Gerät/Fahrzeug wirklich löschen?')) {
      removeEquipment(id);
    }
  }

  function addAppointment() {
    setFormData((p) => {
      if (p.appointments.length >= MAX_APPOINTMENTS_PER_EQUIPMENT) return p;
      return {
        ...p,
        appointments: [
          ...p.appointments,
          { id: generateId(), type: 'TÜV' as AppointmentType, label: '', date: todayIso() },
        ],
      };
    });
  }

  function updateAppointment(index: number, patch: Partial<VehicleAppointment>) {
    setFormData((p) => ({
      ...p,
      appointments: p.appointments.map((a, i) => (i === index ? { ...a, ...patch } : a)),
    }));
  }

  function removeAppointment(index: number) {
    setFormData((p) => ({ ...p, appointments: p.appointments.filter((_, i) => i !== index) }));
  }

  function handleCancel() {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyForm);
  }

  const thStyle = (field?: SortField): React.CSSProperties => ({
    padding: '10px 12px',
    textAlign: 'left',
    fontWeight: 600,
    fontSize: 13,
    borderBottom: '2px solid #e5e7eb',
    cursor: field ? 'pointer' : undefined,
    userSelect: 'none',
    whiteSpace: 'nowrap',
    color: field && sortField === field ? '#2563eb' : undefined,
  });

  function renderFormRow() {
    return (
      <tr key={editingId || '__new'} style={{ backgroundColor: '#eff6ff' }}>
        <td style={{ padding: '10px 12px' }}>
          <input
            type="text"
            placeholder="Bezeichnung"
            value={formData.name}
            onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
            style={inputStyle}
          />
        </td>
        <td style={{ padding: '10px 12px' }}>
          <select
            value={formData.category}
            onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value as EquipmentCategory }))}
            style={selectStyle}
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
            <EquipmentIconPreview
              category={formData.category}
              name={formData.name}
              iconKey={formData.iconKey || undefined}
            />
            <select
              title="Symbol auf der Dispositionstafel"
              value={formData.iconKey}
              onChange={(e) => setFormData((p) => ({ ...p, iconKey: e.target.value as IconKey | '' }))}
              style={{ ...selectStyle, fontSize: 12, padding: '4px 6px' }}
            >
              <option value="">Symbol: automatisch</option>
              {EQUIPMENT_ICON_KEYS.map((k) => (
                <option key={k} value={k}>{ICON_KEY_LABELS[k]}</option>
              ))}
            </select>
          </div>
        </td>
        <td style={{ padding: '10px 12px' }}>
          <input
            type="text"
            placeholder="Kennzeichen"
            value={formData.licensePlate}
            onChange={(e) => setFormData((p) => ({ ...p, licensePlate: e.target.value }))}
            style={inputStyle}
          />
        </td>
        <td style={{ padding: '10px 12px' }}>
          <select
            value={formData.status}
            onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value as EquipmentStatus }))}
            style={selectStyle}
          >
            <option value="verfuegbar">Verfügbar</option>
            <option value="in_reparatur">In Reparatur</option>
            <option value="ausser_betrieb">Außer Betrieb</option>
          </select>
        </td>
        <td style={{ padding: '10px 12px', minWidth: 300 }}>
          {formData.appointments.map((a, i) => (
            <div key={a.id} style={{ display: 'flex', gap: 4, marginBottom: 4, alignItems: 'center' }}>
              <select
                value={a.type}
                onChange={(ev) => updateAppointment(i, { type: ev.target.value as AppointmentType })}
                style={{ ...selectStyle, fontSize: 12, padding: '5px 6px', width: 90 }}
              >
                {APPOINTMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <input
                type="date"
                value={a.date}
                min={todayIso()}
                onChange={(ev) => updateAppointment(i, { date: ev.target.value })}
                style={{ ...inputStyle, fontSize: 12, padding: '5px 6px', width: 140 }}
              />
              <input
                type="text"
                placeholder="Bezeichnung"
                value={a.label}
                onChange={(ev) => updateAppointment(i, { label: ev.target.value })}
                style={{ ...inputStyle, fontSize: 12, padding: '5px 6px', flex: 1, minWidth: 80 }}
              />
              <button
                onClick={() => removeAppointment(i)}
                title="Termin entfernen"
                style={{ ...btnSecondary, padding: '5px 7px' }}
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {formData.appointments.length < MAX_APPOINTMENTS_PER_EQUIPMENT ? (
            <button onClick={addAppointment} style={{ ...btnSecondary, fontSize: 12, padding: '5px 9px' }}>
              <CalendarPlus size={12} /> Termin
            </button>
          ) : (
            <span style={{ fontSize: 11, color: '#9ca3af' }}>max. 3 Termine</span>
          )}
        </td>
        <td style={{ padding: '10px 12px', fontSize: 13, color: '#6b7280' }}>-</td>
        <td style={{ padding: '10px 12px' }}>
          <input
            type="text"
            placeholder="Notizen"
            value={formData.notes}
            onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
            style={inputStyle}
          />
        </td>
        <td style={{ padding: '10px 12px' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={handleSave} style={btnPrimary}>Speichern</button>
            <button onClick={handleCancel} style={btnSecondary}>Abbrechen</button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>
          Maschinen & Fahrzeuge ({equipment.length})
        </h2>
        <button onClick={handleAdd} style={btnPrimary}>
          <Plus size={16} /> Neues Gerät/Fahrzeug
        </button>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: 12,
          padding: '10px 14px',
          backgroundColor: '#fff',
          borderRadius: 8,
          border: '1px solid #e5e7eb',
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 160 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Bezeichnung / Kennzeichen..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 32 }}
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={{ ...selectStyle, width: 'auto', minWidth: 150 }}
        >
          <option value="">Alle Kategorien</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={filterPool}
          onChange={(e) => setFilterPool(e.target.value)}
          style={{ ...selectStyle, width: 'auto', minWidth: 140 }}
        >
          <option value="">Alle Pools</option>
          <option value="fahrzeug">Fuhrpark</option>
          <option value="maschine">Maschinenpark</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ ...selectStyle, width: 'auto', minWidth: 140 }}
        >
          <option value="">Alle Status</option>
          <option value="verfuegbar">Verfügbar</option>
          <option value="in_reparatur">In Reparatur</option>
          <option value="ausser_betrieb">Außer Betrieb</option>
        </select>
        <select
          value={filterAssignment}
          onChange={(e) => setFilterAssignment(e.target.value)}
          style={{ ...selectStyle, width: 'auto', minWidth: 160 }}
        >
          <option value="">Alle Zuordnungen</option>
          <option value="__unassigned">Nicht zugeordnet</option>
          <optgroup label="Baustellen">
            {activeBaustellen.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </optgroup>
        </select>
        {hasActiveFilters && (
          <button onClick={resetFilters} style={{ ...btnSecondary, fontSize: 12, padding: '6px 10px' }}>
            <RotateCcw size={12} /> Zurücksetzen
          </button>
        )}
      </div>

      {/* Active filter chips + result count */}
      {hasActiveFilters && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
          <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>
            {filtered.length} von {equipment.length} Geräten
          </span>
          {activeFilters.map((f, i) => (
            <span key={i} style={filterChipStyle}>
              {f.label}
              <button
                onClick={f.onRemove}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#2563eb', display: 'flex' }}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            backgroundColor: '#fff',
            borderRadius: 8,
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#f8fafc' }}>
              <th style={thStyle('name')} onClick={() => handleSort('name')}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Bezeichnung {renderSortArrow('name')}
                </span>
              </th>
              <th style={thStyle('category')} onClick={() => handleSort('category')}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Kategorie {renderSortArrow('category')}
                </span>
              </th>
              <th style={thStyle()}>Kennzeichen</th>
              <th style={thStyle('status')} onClick={() => handleSort('status')}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Status {renderSortArrow('status')}
                </span>
              </th>
              <th style={thStyle()}>Termine</th>
              <th style={thStyle('assignedTo')} onClick={() => handleSort('assignedTo')}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Zuordnung {renderSortArrow('assignedTo')}
                </span>
              </th>
              <th style={thStyle()}>Notizen</th>
              <th style={{ ...thStyle(), minWidth: 160 }}>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {showForm && renderFormRow()}
            {filtered.map((e) => {
              if (editingId === e.id) return renderFormRow();
              const sc = getStatusColor(e.status);
              return (
                <tr
                  key={e.id}
                  style={{ borderBottom: '1px solid #e5e7eb' }}
                  onMouseEnter={(ev) => { (ev.currentTarget as HTMLElement).style.backgroundColor = '#f8fafc'; }}
                  onMouseLeave={(ev) => { (ev.currentTarget as HTMLElement).style.backgroundColor = ''; }}
                >
                  <td style={{ padding: '10px 12px', fontSize: 14, fontWeight: 500 }}>{e.name}</td>
                  <td style={{ padding: '10px 12px', fontSize: 14 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <EquipmentIconPreview category={e.category} name={e.name} iconKey={e.iconKey} />
                      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600, backgroundColor: '#f5f5f5', color: '#525252' }}>
                        {e.category}
                      </span>
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 14, color: '#374151' }}>
                    {e.licensePlate || '-'}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600, backgroundColor: sc.bg, color: sc.color }}>
                      {getStatusLabel(e.status)}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <AppointmentChips appointments={e.appointments ?? []} />
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 14, color: '#374151' }}>
                    {getAssignmentLabel(e.assignedTo, baustellen)}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 13, color: '#6b7280' }}>
                    {e.notes || '-'}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => handleEdit(e)} style={btnSecondary}>
                        <Pencil size={13} /> Bearbeiten
                      </button>
                      <button onClick={() => handleDelete(e.id)} style={btnDanger}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && !showForm && (
              <tr>
                <td colSpan={7} style={{ padding: '24px 12px', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
                  Keine Geräte/Fahrzeuge gefunden
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
