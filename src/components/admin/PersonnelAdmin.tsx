import { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import type { Personnel, PersonnelRole, RecurringRule, RulePattern, RuleTargetPool } from '../../types';
import { generateId, WEEKDAY_NAMES } from '../../types';
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, X, ArrowUp, ArrowDown, Search, RotateCcw } from 'lucide-react';

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

interface FormData {
  firstName: string;
  lastName: string;
  role: PersonnelRole;
  phone: string;
  notes: string;
}

const emptyForm: FormData = {
  firstName: '',
  lastName: '',
  role: 'Facharbeiter',
  phone: '',
  notes: '',
};

type SortField = 'name' | 'role' | 'assignedTo';
type SortDir = 'asc' | 'desc';

const poolLabels: Record<string, string> = {
  verfuegbar: 'Verfügbar',
  krank: 'Krank',
  schule: 'Schule',
  frei: 'Frei',
  nicht_verfuegbar: 'Nicht verfügbar',
};

function getAssignmentLabel(assignedTo: string, baustellen: { id: string; name: string }[]): string {
  if (poolLabels[assignedTo]) return poolLabels[assignedTo];
  const bs = baustellen.find((b) => b.id === assignedTo);
  return bs ? bs.name : assignedTo;
}

const roleOrder: Record<PersonnelRole, number> = { Bauleitung: 0, Vorarbeiter: 1, Facharbeiter: 2, Azubi: 3 };

function RuleEditor({ personnelId, rules }: { personnelId: string; rules: RecurringRule[] }) {
  const { addRule, removeRule } = useStore();
  const [adding, setAdding] = useState(false);
  const [newRule, setNewRule] = useState<{
    weekdays: number[];
    pattern: RulePattern;
    targetPool: RuleTargetPool;
    validFrom: string;
    validUntil: string;
    description: string;
  }>({
    weekdays: [],
    pattern: 'weekly',
    targetPool: 'schule',
    validFrom: '',
    validUntil: '',
    description: '',
  });

  function handleSaveRule() {
    if (newRule.weekdays.length === 0) return;
    addRule(personnelId, {
      id: generateId(),
      ...newRule,
    });
    setAdding(false);
    setNewRule({ weekdays: [], pattern: 'weekly', targetPool: 'schule', validFrom: '', validUntil: '', description: '' });
  }

  function toggleWeekday(day: number) {
    setNewRule((prev) => ({
      ...prev,
      weekdays: prev.weekdays.includes(day)
        ? prev.weekdays.filter((d) => d !== day)
        : [...prev.weekdays, day].sort(),
    }));
  }

  const targetPoolLabels: Record<RuleTargetPool, string> = {
    schule: 'Schule',
    frei: 'Frei',
    nicht_verfuegbar: 'Nicht verfügbar',
  };

  return (
    <div style={{ marginTop: 8, padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: 6, border: '1px solid #e5e7eb' }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#374151' }}>
        Wiederkehrende Regeln ({rules.length})
      </div>
      {rules.map((rule) => (
        <div
          key={rule.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 0',
            borderBottom: '1px solid #e5e7eb',
            fontSize: 13,
          }}
        >
          <span style={{ flex: 1 }}>
            {rule.weekdays.map((d) => WEEKDAY_NAMES[d]).join(', ')} - {targetPoolLabels[rule.targetPool]} ({rule.pattern})
            {rule.description && <span style={{ color: '#6b7280' }}> - {rule.description}</span>}
          </span>
          <span style={{ fontSize: 11, color: '#9ca3af' }}>
            {rule.validFrom} bis {rule.validUntil}
          </span>
          <button
            onClick={() => removeRule(personnelId, rule.id)}
            style={{ ...btnDanger, padding: '4px 8px', fontSize: 12 }}
          >
            <X size={12} />
          </button>
        </div>
      ))}
      {!adding ? (
        <button
          onClick={() => setAdding(true)}
          style={{ ...btnSecondary, marginTop: 6, fontSize: 12 }}
        >
          <Plus size={12} /> Neue Regel
        </button>
      ) : (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Wochentage</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {WEEKDAY_NAMES.map((name, i) => (
                <button
                  key={i}
                  onClick={() => toggleWeekday(i)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 4,
                    border: '1px solid #d1d5db',
                    backgroundColor: newRule.weekdays.includes(i) ? '#2563eb' : '#fff',
                    color: newRule.weekdays.includes(i) ? '#fff' : '#374151',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Muster</div>
              <select
                value={newRule.pattern}
                onChange={(e) => setNewRule((prev) => ({ ...prev, pattern: e.target.value as RulePattern }))}
                style={selectStyle}
              >
                <option value="weekly">Wöchentlich</option>
                <option value="biweekly">Zweiwöchentlich</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Ziel-Pool</div>
              <select
                value={newRule.targetPool}
                onChange={(e) => setNewRule((prev) => ({ ...prev, targetPool: e.target.value as RuleTargetPool }))}
                style={selectStyle}
              >
                <option value="schule">Schule</option>
                <option value="frei">Frei</option>
                <option value="nicht_verfuegbar">Nicht verfügbar</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Gültig von</div>
              <input
                type="date"
                value={newRule.validFrom}
                onChange={(e) => setNewRule((prev) => ({ ...prev, validFrom: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Gültig bis</div>
              <input
                type="date"
                value={newRule.validUntil}
                onChange={(e) => setNewRule((prev) => ({ ...prev, validUntil: e.target.value }))}
                style={inputStyle}
              />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Beschreibung</div>
            <input
              type="text"
              value={newRule.description}
              onChange={(e) => setNewRule((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="z.B. Berufsschule Mo+Di"
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSaveRule} style={btnPrimary}>
              Speichern
            </button>
            <button onClick={() => setAdding(false)} style={btnSecondary}>
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function PersonnelAdmin() {
  const { personnel, baustellen, addPersonnel, updatePersonnel, removePersonnel } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());

  // Sort state
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Filter state
  const [filterRole, setFilterRole] = useState<string>('');
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

  // Filter + sort
  const filtered = useMemo(() => {
    let result = [...personnel];

    // Text search
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter(
        (p) =>
          p.firstName.toLowerCase().includes(q) ||
          p.lastName.toLowerCase().includes(q) ||
          `${p.lastName}, ${p.firstName}`.toLowerCase().includes(q)
      );
    }

    // Role filter
    if (filterRole) {
      result = result.filter((p) => p.role === filterRole);
    }

    // Assignment filter
    if (filterAssignment) {
      result = result.filter((p) => p.assignedTo === filterAssignment);
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = `${a.lastName}, ${a.firstName}`.localeCompare(`${b.lastName}, ${b.firstName}`);
          break;
        case 'role':
          cmp = roleOrder[a.role] - roleOrder[b.role];
          break;
        case 'assignedTo': {
          const la = getAssignmentLabel(a.assignedTo, baustellen);
          const lb = getAssignmentLabel(b.assignedTo, baustellen);
          cmp = la.localeCompare(lb);
          break;
        }
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [personnel, searchText, filterRole, filterAssignment, sortField, sortDir, baustellen]);

  const hasActiveFilters = filterRole !== '' || filterAssignment !== '' || searchText.trim() !== '';

  function resetFilters() {
    setFilterRole('');
    setFilterAssignment('');
    setSearchText('');
  }

  // Active filter chips
  const activeFilters: { label: string; onRemove: () => void }[] = [];
  if (filterRole) activeFilters.push({ label: `Rolle: ${filterRole}`, onRemove: () => setFilterRole('') });
  if (filterAssignment) {
    const label = getAssignmentLabel(filterAssignment, baustellen);
    activeFilters.push({ label: `Zuordnung: ${label}`, onRemove: () => setFilterAssignment('') });
  }
  if (searchText.trim()) activeFilters.push({ label: `Suche: "${searchText}"`, onRemove: () => setSearchText('') });

  function handleAdd() {
    setShowForm(true);
    setEditingId(null);
    setFormData(emptyForm);
  }

  function handleEdit(p: Personnel) {
    setEditingId(p.id);
    setShowForm(false);
    setFormData({
      firstName: p.firstName,
      lastName: p.lastName,
      role: p.role,
      phone: p.phone,
      notes: p.notes,
    });
  }

  function handleSave() {
    if (!formData.firstName.trim() || !formData.lastName.trim()) return;
    if (editingId) {
      updatePersonnel(editingId, formData);
      setEditingId(null);
    } else {
      addPersonnel({
        id: generateId(),
        ...formData,
        assignedTo: 'verfuegbar',
        recurringRules: [],
        autoAbsent: false,
        createdAt: new Date().toISOString().split('T')[0],
      });
      setShowForm(false);
    }
    setFormData(emptyForm);
  }

  function handleDelete(id: string) {
    if (window.confirm('Mitarbeiter wirklich löschen?')) {
      removePersonnel(id);
    }
  }

  function handleCancel() {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyForm);
  }

  function toggleRules(id: string) {
    setExpandedRules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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

  function renderFormRow(isNew: boolean) {
    return (
      <tr key={isNew ? '__new' : editingId} style={{ backgroundColor: '#eff6ff' }}>
        <td style={{ padding: '10px 12px' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type="text"
              placeholder="Vorname"
              value={formData.firstName}
              onChange={(e) => setFormData((p) => ({ ...p, firstName: e.target.value }))}
              style={{ ...inputStyle, width: '50%' }}
            />
            <input
              type="text"
              placeholder="Nachname"
              value={formData.lastName}
              onChange={(e) => setFormData((p) => ({ ...p, lastName: e.target.value }))}
              style={{ ...inputStyle, width: '50%' }}
            />
          </div>
        </td>
        <td style={{ padding: '10px 12px' }}>
          <select
            value={formData.role}
            onChange={(e) => setFormData((p) => ({ ...p, role: e.target.value as PersonnelRole }))}
            style={selectStyle}
          >
            <option value="Bauleitung">Bauleitung</option>
            <option value="Vorarbeiter">Vorarbeiter</option>
            <option value="Facharbeiter">Facharbeiter</option>
            <option value="Azubi">Azubi</option>
          </select>
        </td>
        <td style={{ padding: '10px 12px' }}>
          <input
            type="text"
            placeholder="Telefon"
            value={formData.phone}
            onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
            style={inputStyle}
          />
        </td>
        <td style={{ padding: '10px 12px', fontSize: 13, color: '#6b7280' }}>
          {isNew ? '-' : getAssignmentLabel(personnel.find((p) => p.id === editingId)?.assignedTo || '', baustellen)}
        </td>
        <td style={{ padding: '10px 12px', fontSize: 13, color: '#6b7280' }}>-</td>
        <td style={{ padding: '10px 12px' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={handleSave} style={btnPrimary}>
              Speichern
            </button>
            <button onClick={handleCancel} style={btnSecondary}>
              Abbrechen
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>
          Personal ({personnel.length})
        </h2>
        <button onClick={handleAdd} style={btnPrimary}>
          <Plus size={16} /> Neuer Mitarbeiter
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
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Name suchen..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 32 }}
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          style={{ ...selectStyle, width: 'auto', minWidth: 140 }}
        >
          <option value="">Alle Rollen</option>
          <option value="Vorarbeiter">Vorarbeiter</option>
          <option value="Facharbeiter">Facharbeiter</option>
          <option value="Azubi">Azubi</option>
        </select>
        <select
          value={filterAssignment}
          onChange={(e) => setFilterAssignment(e.target.value)}
          style={{ ...selectStyle, width: 'auto', minWidth: 180 }}
        >
          <option value="">Alle Zuordnungen</option>
          <option value="verfuegbar">Verfügbar</option>
          <option value="krank">Krank</option>
          <option value="schule">Schule</option>
          <option value="frei">Frei</option>
          <option value="nicht_verfuegbar">Nicht verfügbar</option>
          <optgroup label="Baustellen">
            {activeBaustellen.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
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
            {filtered.length} von {personnel.length} Mitarbeitern
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
                  Name {renderSortArrow('name')}
                </span>
              </th>
              <th style={thStyle('role')} onClick={() => handleSort('role')}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Rolle {renderSortArrow('role')}
                </span>
              </th>
              <th style={thStyle()}>Telefon</th>
              <th style={thStyle('assignedTo')} onClick={() => handleSort('assignedTo')}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Zuordnung {renderSortArrow('assignedTo')}
                </span>
              </th>
              <th style={thStyle()}>Regeln</th>
              <th style={{ ...thStyle(), minWidth: 160 }}>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {showForm && renderFormRow(true)}
            {filtered.map((p) => {
              if (editingId === p.id) return renderFormRow(false);
              const isExpanded = expandedRules.has(p.id);
              return (
                <tr
                  key={p.id}
                  style={{ borderBottom: '1px solid #e5e7eb' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#f8fafc'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = ''; }}
                >
                  <td style={{ padding: '10px 12px', fontSize: 14 }}>
                    <span style={{ fontWeight: p.role === 'Bauleitung' || p.role === 'Vorarbeiter' ? 700 : 500 }}>
                      {p.lastName}, {p.firstName}
                    </span>
                    {p.notes && (
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{p.notes}</div>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 14 }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        backgroundColor:
                          p.role === 'Bauleitung' ? '#faf5ff' : p.role === 'Vorarbeiter' ? '#fff7ed' : p.role === 'Azubi' ? '#f0fdf4' : '#eff6ff',
                        color:
                          p.role === 'Bauleitung' ? '#7c3aed' : p.role === 'Vorarbeiter' ? '#ea580c' : p.role === 'Azubi' ? '#16a34a' : '#2563eb',
                      }}
                    >
                      {p.role}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 14, color: '#374151' }}>{p.phone}</td>
                  <td style={{ padding: '10px 12px', fontSize: 14, color: '#374151' }}>
                    {getAssignmentLabel(p.assignedTo, baustellen)}
                    {p.autoAbsent && (
                      <span style={{ fontSize: 11, color: '#dc2626', marginLeft: 6 }}>(auto)</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <button
                      onClick={() => toggleRules(p.id)}
                      style={{
                        ...btnSecondary,
                        fontSize: 12,
                        padding: '4px 8px',
                        backgroundColor: p.recurringRules.length > 0 ? '#eff6ff' : '#fff',
                      }}
                    >
                      {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      {p.recurringRules.length} Regeln
                    </button>
                    {isExpanded && (
                      <RuleEditor personnelId={p.id} rules={p.recurringRules} />
                    )}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => handleEdit(p)} style={btnSecondary}>
                        <Pencil size={13} /> Bearbeiten
                      </button>
                      <button onClick={() => handleDelete(p.id)} style={btnDanger}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && !showForm && (
              <tr>
                <td colSpan={6} style={{ padding: '24px 12px', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
                  Keine Mitarbeiter gefunden
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
