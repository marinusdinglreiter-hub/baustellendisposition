import { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { fileStore } from '../../utils/fileStore';
import type { Baustelle, BaustellenStatus } from '../../types';
import { generateId } from '../../types';
import { Plus, Pencil, Trash2, Archive, ArrowUp, ArrowDown, Search, RotateCcw, X } from 'lucide-react';

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

const btnWarning: React.CSSProperties = {
  padding: '6px 12px',
  backgroundColor: '#f59e0b',
  color: '#fff',
  border: 'none',
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

const PRESET_COLORS = [
  '#2563eb', '#dc2626', '#059669', '#7c3aed', '#d97706',
  '#0891b2', '#be185d', '#4f46e5', '#b45309', '#047857',
  '#6366f1', '#e11d48', '#0d9488', '#9333ea', '#ca8a04',
];

interface FormData {
  name: string;
  address: string;
  status: BaustellenStatus;
  client: string;
  notes: string;
  startDate: string;
  endDate: string;
  color: string;
}

const emptyForm: FormData = {
  name: '',
  address: '',
  status: 'Vorbereitung',
  client: '',
  notes: '',
  startDate: '',
  endDate: '',
  color: '#2563eb',
};

type SortField = 'name' | 'status' | 'resources' | 'startDate' | 'endDate';
type SortDir = 'asc' | 'desc';

const statusOrder: Record<BaustellenStatus, number> = { Aktiv: 0, Vorbereitung: 1, Nachbereitung: 2, Archiviert: 3 };

function getStatusColor(status: BaustellenStatus): { bg: string; color: string } {
  switch (status) {
    case 'Aktiv': return { bg: '#f0fdf4', color: '#16a34a' };
    case 'Vorbereitung': return { bg: '#fffbeb', color: '#d97706' };
    case 'Nachbereitung': return { bg: '#eff6ff', color: '#2563eb' };
    case 'Archiviert': return { bg: '#f3f4f6', color: '#6b7280' };
  }
}

export function BaustellenAdmin() {
  const { baustellen, personnel, equipment, addBaustelle, updateBaustelle, removeBaustelle, archiveBaustelle } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);

  // Sort state
  const [sortField, setSortField] = useState<SortField>('status');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Filter state - default hides archived
  const [filterStatus, setFilterStatus] = useState<string>('__not_archived');
  const [searchText, setSearchText] = useState('');

  function getResourceCount(baustelleId: string): number {
    return personnel.filter((p) => p.assignedTo === baustelleId).length +
           equipment.filter((e) => e.assignedTo === baustelleId).length;
  }

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

  // Kurzfristige Einsaetze gehoeren nicht in die Buerotabelle, solange sie
  // nicht umgewandelt sind: die Zeilenknoepfe (Archivieren) widersprechen den
  // beiden Kartenaktionen auf der Tafel. Umgewandelte tauchen automatisch auf,
  // weil dabei das Kennzeichen faellt.
  const verwaltete = useMemo(() => baustellen.filter((b) => !b.kurzfristig), [baustellen]);

  const filtered = useMemo(() => {
    let result = [...verwaltete];

    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.address.toLowerCase().includes(q) ||
          b.client.toLowerCase().includes(q)
      );
    }

    if (filterStatus === '__not_archived') {
      result = result.filter((b) => b.status !== 'Archiviert');
    } else if (filterStatus) {
      result = result.filter((b) => b.status === filterStatus);
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'status':
          cmp = statusOrder[a.status] - statusOrder[b.status];
          if (cmp === 0) cmp = a.name.localeCompare(b.name);
          break;
        case 'resources':
          cmp = getResourceCount(a.id) - getResourceCount(b.id);
          break;
        case 'startDate':
          cmp = (a.startDate || '').localeCompare(b.startDate || '');
          break;
        case 'endDate':
          cmp = (a.endDate || '').localeCompare(b.endDate || '');
          break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [verwaltete, searchText, filterStatus, sortField, sortDir, personnel, equipment]);

  const hasActiveFilters = filterStatus !== '__not_archived' || searchText.trim() !== '';

  function resetFilters() {
    setFilterStatus('__not_archived');
    setSearchText('');
  }

  const activeFilters: { label: string; onRemove: () => void }[] = [];
  if (filterStatus && filterStatus !== '__not_archived') {
    activeFilters.push({
      label: `Status: ${filterStatus === '' ? 'Alle (inkl. Archiviert)' : filterStatus}`,
      onRemove: () => setFilterStatus('__not_archived'),
    });
  }
  if (searchText.trim()) activeFilters.push({ label: `Suche: "${searchText}"`, onRemove: () => setSearchText('') });

  function handleAdd() {
    setShowForm(true);
    setEditingId(null);
    setFormData(emptyForm);
  }

  function handleEdit(b: Baustelle) {
    setEditingId(b.id);
    setShowForm(false);
    setFormData({
      name: b.name,
      address: b.address,
      status: b.status,
      client: b.client,
      notes: b.notes,
      startDate: b.startDate,
      endDate: b.endDate,
      color: b.color,
    });
  }

  function handleSave() {
    if (!formData.name.trim()) return;
    if (editingId) {
      updateBaustelle(editingId, formData);
      setEditingId(null);
    } else {
      addBaustelle({
        id: generateId(),
        ...formData,
        createdAt: new Date().toISOString().split('T')[0],
      });
      setShowForm(false);
    }
    setFormData(emptyForm);
  }

  function handleDelete(id: string) {
    const b = baustellen.find((x) => x.id === id);
    const fileCount = b?.attachments?.length ?? 0;
    const extra =
      fileCount > 0
        ? ` ${fileCount} abgelegte${fileCount === 1 ? 'r Plan wird' : ' Pläne werden'} mitgelöscht.`
        : '';
    if (window.confirm('Baustelle wirklich löschen? Alle zugeordneten Ressourcen werden zurück in die Pools verschoben.' + extra)) {
      // Blobs zuerst, danach der Datensatz – die Store-Action bleibt synchron
      void fileStore.removeByBaustelle(id);
      removeBaustelle(id);
    }
  }

  function handleArchive(id: string) {
    if (window.confirm('Baustelle archivieren? Alle zugeordneten Ressourcen werden zurück in die Pools verschoben.')) {
      archiveBaustelle(id);
    }
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
            placeholder="Name"
            value={formData.name}
            onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
            style={inputStyle}
          />
          <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setFormData((p) => ({ ...p, color: c }))}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  border: formData.color === c ? '2px solid #1e293b' : '2px solid transparent',
                  backgroundColor: c,
                  cursor: 'pointer',
                  padding: 0,
                }}
              />
            ))}
          </div>
        </td>
        <td style={{ padding: '10px 12px' }}>
          <input
            type="text"
            placeholder="Adresse"
            value={formData.address}
            onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
            style={inputStyle}
          />
        </td>
        <td style={{ padding: '10px 12px' }}>
          <select
            value={formData.status}
            onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value as BaustellenStatus }))}
            style={selectStyle}
          >
            <option value="Vorbereitung">Vorbereitung</option>
            <option value="Aktiv">Aktiv</option>
            <option value="Nachbereitung">Nachbereitung</option>
            <option value="Archiviert">Archiviert</option>
          </select>
        </td>
        <td style={{ padding: '10px 12px' }}>
          <input
            type="text"
            placeholder="Bauherr"
            value={formData.client}
            onChange={(e) => setFormData((p) => ({ ...p, client: e.target.value }))}
            style={inputStyle}
          />
        </td>
        <td style={{ padding: '10px 12px', fontSize: 13, color: '#6b7280' }}>-</td>
        <td style={{ padding: '10px 12px' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData((p) => ({ ...p, startDate: e.target.value }))}
              style={{ ...inputStyle, width: '48%' }}
            />
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData((p) => ({ ...p, endDate: e.target.value }))}
              style={{ ...inputStyle, width: '48%' }}
            />
          </div>
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
          Baustellen ({verwaltete.length})
        </h2>
        <button onClick={handleAdd} style={btnPrimary}>
          <Plus size={16} /> Neue Baustelle
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
            placeholder="Name, Adresse, Bauherr..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 32 }}
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ ...selectStyle, width: 'auto', minWidth: 180 }}
        >
          <option value="__not_archived">Ohne Archivierte</option>
          <option value="">Alle (inkl. Archiviert)</option>
          <option value="Vorbereitung">Vorbereitung</option>
          <option value="Aktiv">Aktiv</option>
          <option value="Nachbereitung">Nachbereitung</option>
          <option value="Archiviert">Nur Archiviert</option>
        </select>
        {hasActiveFilters && (
          <button onClick={resetFilters} style={{ ...btnSecondary, fontSize: 12, padding: '6px 10px' }}>
            <RotateCcw size={12} /> Zurücksetzen
          </button>
        )}
      </div>

      {/* Active filter chips + result count */}
      {(activeFilters.length > 0 || searchText.trim()) && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
          <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>
            {filtered.length} von {verwaltete.length} Baustellen
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
              <th style={thStyle()}>Adresse</th>
              <th style={thStyle('status')} onClick={() => handleSort('status')}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Status {renderSortArrow('status')}
                </span>
              </th>
              <th style={thStyle()}>Bauherr</th>
              <th style={thStyle('resources')} onClick={() => handleSort('resources')}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Ressourcen {renderSortArrow('resources')}
                </span>
              </th>
              <th style={thStyle('startDate')} onClick={() => handleSort('startDate')}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Zeitraum {renderSortArrow('startDate')}
                </span>
              </th>
              <th style={{ ...thStyle(), minWidth: 200 }}>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {showForm && renderFormRow()}
            {filtered.map((b) => {
              if (editingId === b.id) return renderFormRow();
              const sc = getStatusColor(b.status);
              const resCount = getResourceCount(b.id);
              return (
                <tr
                  key={b.id}
                  style={{ borderBottom: '1px solid #e5e7eb' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#f8fafc'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = ''; }}
                >
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 3,
                          backgroundColor: b.color,
                          flexShrink: 0,
                        }}
                      />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{b.name}</div>
                        {b.notes && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{b.notes}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 14, color: '#374151' }}>{b.address || '-'}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600, backgroundColor: sc.bg, color: sc.color }}>
                      {b.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 14, color: '#374151' }}>{b.client || '-'}</td>
                  <td style={{ padding: '10px 12px', fontSize: 14, color: '#374151', textAlign: 'center' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 700,
                      backgroundColor: resCount > 0 ? '#eff6ff' : '#f3f4f6',
                      color: resCount > 0 ? '#2563eb' : '#9ca3af',
                    }}>
                      {resCount}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 13, color: '#6b7280' }}>
                    {b.startDate || '–'} bis {b.endDate || '–'}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => handleEdit(b)} style={btnSecondary}>
                        <Pencil size={13} /> Bearbeiten
                      </button>
                      {b.status !== 'Archiviert' && (
                        <button onClick={() => handleArchive(b.id)} style={btnWarning}>
                          <Archive size={13} /> Archiv
                        </button>
                      )}
                      <button onClick={() => handleDelete(b.id)} style={btnDanger}>
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
                  Keine Baustellen gefunden
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
