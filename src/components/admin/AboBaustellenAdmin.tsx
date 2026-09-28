import { useState } from 'react';
import { useStore } from '../../store/useStore';
import type { AboBaustelle } from '../../types';
import { ABO_WEEKDAY_LABELS, generateId } from '../../types';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, CalendarClock, ChevronDown, ChevronUp } from 'lucide-react';

const PRESET_COLORS = [
  '#2563eb', '#dc2626', '#059669', '#7c3aed',
  '#d97706', '#0891b2', '#be185d', '#4f46e5',
  '#047857', '#b45309',
];

const RHYTHMUS_LABELS: Record<number, string> = {
  1: 'Jede Woche',
  2: 'Jede 2. Woche',
  3: 'Jede 3. Woche',
  4: 'Jede 4. Woche',
};

const WEEKDAY_ENTRIES = Object.entries(ABO_WEEKDAY_LABELS).map(([k, v]) => ({
  value: Number(k),
  label: v,
}));

function formatDate(iso: string): string {
  if (!iso) return '–';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

function buildLabel(abo: AboBaustelle): string {
  const day = ABO_WEEKDAY_LABELS[abo.wochentag] ?? '?';
  return `${RHYTHMUS_LABELS[abo.rhythmus] ?? `Jede ${abo.rhythmus}. Woche`} – ${day}`;
}

const emptyForm = (): Partial<AboBaustelle> => ({
  name: '',
  adresse: '',
  auftragsnummer: '',
  wochentag: 1,
  rhythmus: 1,
  gueltigAb: new Date().toISOString().split('T')[0],
  gueltigBis: null,
  aktiv: true,
  notizen: '',
  color: '#2563eb',
});

export function AboBaustellenAdmin() {
  const { aboBaustellen, addAboBaustelle, updateAboBaustelle, removeAboBaustelle } = useStore();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<AboBaustelle>>(emptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function openNew() {
    setEditingId(null);
    setForm(emptyForm());
    setErrors({});
    setShowForm(true);
  }

  function openEdit(abo: AboBaustelle) {
    setEditingId(abo.id);
    setForm({ ...abo });
    setErrors({});
    setShowForm(true);
    setExpandedId(null);
  }

  function cancel() {
    setShowForm(false);
    setEditingId(null);
    setErrors({});
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name?.trim()) e.name = 'Baustellenname ist Pflichtfeld';
    if (!form.gueltigAb) e.gueltigAb = 'Startdatum ist Pflichtfeld';
    if (form.gueltigBis && form.gueltigAb && form.gueltigBis < form.gueltigAb) {
      e.gueltigBis = '"Gültig bis" muss nach "Gültig ab" liegen';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function save() {
    if (!validate()) return;

    const abo: AboBaustelle = {
      id: editingId ?? generateId(),
      name: form.name!.trim(),
      adresse: form.adresse?.trim() ?? '',
      auftragsnummer: form.auftragsnummer?.trim() ?? '',
      wochentag: form.wochentag ?? 1,
      rhythmus: form.rhythmus ?? 1,
      gueltigAb: form.gueltigAb!,
      gueltigBis: form.gueltigBis ?? null,
      aktiv: form.aktiv ?? true,
      notizen: form.notizen?.trim() ?? '',
      color: form.color ?? '#2563eb',
    };

    if (editingId) {
      updateAboBaustelle(editingId, abo);
    } else {
      addAboBaustelle(abo);
    }

    cancel();
  }

  function toggleActive(abo: AboBaustelle) {
    updateAboBaustelle(abo.id, { aktiv: !abo.aktiv });
  }

  function handleDelete(id: string) {
    if (window.confirm('Abo-Baustelle wirklich löschen?')) {
      removeAboBaustelle(id);
      if (expandedId === id) setExpandedId(null);
    }
  }

  const set = (key: keyof AboBaustelle, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <div style={{ maxWidth: 800 }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>
            Wiederkehrende Baustellen
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
            Baustellen die automatisch an bestimmten Wochentagen angelegt werden
          </p>
        </div>
        <button
          onClick={openNew}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', border: 'none', borderRadius: 8,
            backgroundColor: '#2563eb', color: '#fff', cursor: 'pointer',
            fontSize: 13, fontWeight: 600,
          }}
        >
          <Plus size={14} />
          Neue Abo-Baustelle
        </button>
      </div>

      {/* ── Form ── */}
      {showForm && (
        <div
          style={{
            backgroundColor: '#fff', border: '2px solid #2563eb', borderRadius: 12,
            padding: 20, marginBottom: 20,
          }}
        >
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#1e293b' }}>
            {editingId ? 'Abo-Baustelle bearbeiten' : 'Neue Abo-Baustelle anlegen'}
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* Name */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Baustellenname *</label>
              <input
                value={form.name ?? ''}
                onChange={(e) => set('name', e.target.value)}
                placeholder="z.B. Gewerbepark Pflege"
                style={{ ...inputStyle, borderColor: errors.name ? '#ef4444' : '#d1d5db' }}
              />
              {errors.name && <span style={errorStyle}>{errors.name}</span>}
            </div>

            {/* Adresse */}
            <div>
              <label style={labelStyle}>Adresse / Standort</label>
              <input
                value={form.adresse ?? ''}
                onChange={(e) => set('adresse', e.target.value)}
                placeholder="Musterstraße 12, Berlin"
                style={inputStyle}
              />
            </div>

            {/* Auftragsnummer */}
            <div>
              <label style={labelStyle}>Auftragsnummer</label>
              <input
                value={form.auftragsnummer ?? ''}
                onChange={(e) => set('auftragsnummer', e.target.value)}
                placeholder="z.B. 2024-081"
                style={inputStyle}
              />
            </div>

            {/* Wochentag */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Wochentag</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {WEEKDAY_ENTRIES.map(({ value, label }) => {
                  const active = form.wochentag === value;
                  return (
                    <button
                      key={value}
                      onClick={() => set('wochentag', value)}
                      style={{
                        padding: '6px 14px', borderRadius: 6, border: '2px solid',
                        borderColor: active ? '#2563eb' : '#d1d5db',
                        backgroundColor: active ? '#2563eb' : '#fff',
                        color: active ? '#fff' : '#374151',
                        cursor: 'pointer', fontWeight: active ? 700 : 500, fontSize: 13,
                        transition: 'all 0.15s',
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rhythmus */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Wiederholungsrhythmus</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[1, 2, 3, 4].map((r) => {
                  const active = form.rhythmus === r;
                  return (
                    <button
                      key={r}
                      onClick={() => set('rhythmus', r)}
                      style={{
                        padding: '6px 14px', borderRadius: 6, border: '2px solid',
                        borderColor: active ? '#7c3aed' : '#d1d5db',
                        backgroundColor: active ? '#7c3aed' : '#fff',
                        color: active ? '#fff' : '#374151',
                        cursor: 'pointer', fontWeight: active ? 700 : 500, fontSize: 13,
                        transition: 'all 0.15s',
                      }}
                    >
                      {RHYTHMUS_LABELS[r]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Gültig ab */}
            <div>
              <label style={labelStyle}>Gültig ab *</label>
              <input
                type="date"
                value={form.gueltigAb ?? ''}
                onChange={(e) => set('gueltigAb', e.target.value)}
                style={{ ...inputStyle, borderColor: errors.gueltigAb ? '#ef4444' : '#d1d5db' }}
              />
              {errors.gueltigAb && <span style={errorStyle}>{errors.gueltigAb}</span>}
            </div>

            {/* Gültig bis */}
            <div>
              <label style={labelStyle}>Gültig bis (leer = unbegrenzt)</label>
              <input
                type="date"
                value={form.gueltigBis ?? ''}
                onChange={(e) => set('gueltigBis', e.target.value || null)}
                style={{ ...inputStyle, borderColor: errors.gueltigBis ? '#ef4444' : '#d1d5db' }}
              />
              {errors.gueltigBis && <span style={errorStyle}>{errors.gueltigBis}</span>}
            </div>

            {/* Farbe */}
            <div>
              <label style={labelStyle}>Farbe der Baustellen-Karte</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => set('color', c)}
                    style={{
                      width: 26, height: 26, borderRadius: '50%', backgroundColor: c,
                      border: form.color === c ? '3px solid #1e293b' : '3px solid transparent',
                      cursor: 'pointer', outline: 'none',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Notizen */}
            <div>
              <label style={labelStyle}>Notizen</label>
              <textarea
                value={form.notizen ?? ''}
                onChange={(e) => set('notizen', e.target.value)}
                placeholder="Optionale Hinweise..."
                rows={2}
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
            <button onClick={cancel} style={btnSecondaryStyle}>Abbrechen</button>
            <button onClick={save} style={btnPrimaryStyle}>
              {editingId ? 'Speichern' : 'Abo anlegen'}
            </button>
          </div>
        </div>
      )}

      {/* ── List ── */}
      {aboBaustellen.length === 0 && !showForm && (
        <div
          style={{
            textAlign: 'center', padding: '48px 24px', color: '#94a3b8',
            border: '2px dashed #e2e8f0', borderRadius: 12,
          }}
        >
          <CalendarClock size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
          <p style={{ margin: 0, fontSize: 14 }}>Noch keine Abo-Baustellen angelegt</p>
          <p style={{ margin: '4px 0 0', fontSize: 12 }}>
            Klicke auf „Neue Abo-Baustelle" um loszulegen
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {aboBaustellen.map((abo) => {
          const isExpanded = expandedId === abo.id;
          return (
            <div
              key={abo.id}
              style={{
                backgroundColor: '#fff', borderRadius: 10, overflow: 'hidden',
                border: `2px solid ${abo.aktiv ? '#e2e8f0' : '#f1f5f9'}`,
                opacity: abo.aktiv ? 1 : 0.65,
                transition: 'opacity 0.2s',
              }}
            >
              {/* Row */}
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                }}
              >
                {/* Color dot */}
                <div
                  style={{
                    width: 12, height: 12, borderRadius: '50%',
                    backgroundColor: abo.color, flexShrink: 0,
                  }}
                />

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {abo.name}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    {buildLabel(abo)}
                    {abo.adresse && <> · {abo.adresse}</>}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                    Ab {formatDate(abo.gueltigAb)}
                    {abo.gueltigBis ? ` bis ${formatDate(abo.gueltigBis)}` : ' · unbegrenzt'}
                    {abo.auftragsnummer && ` · ${abo.auftragsnummer}`}
                  </div>
                </div>

                {/* Status badge */}
                <span
                  style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                    backgroundColor: abo.aktiv ? '#dcfce7' : '#f1f5f9',
                    color: abo.aktiv ? '#166534' : '#94a3b8',
                    flexShrink: 0,
                  }}
                >
                  {abo.aktiv ? 'Aktiv' : 'Pausiert'}
                </span>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <button
                    onClick={() => toggleActive(abo)}
                    title={abo.aktiv ? 'Pausieren' : 'Aktivieren'}
                    style={iconBtnStyle(abo.aktiv ? '#2563eb' : '#94a3b8')}
                  >
                    {abo.aktiv
                      ? <ToggleRight size={18} />
                      : <ToggleLeft size={18} />
                    }
                  </button>
                  <button
                    onClick={() => openEdit(abo)}
                    title="Bearbeiten"
                    style={iconBtnStyle('#64748b')}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(abo.id)}
                    title="Löschen"
                    style={iconBtnStyle('#ef4444')}
                  >
                    <Trash2 size={14} />
                  </button>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : abo.id)}
                    title="Details"
                    style={iconBtnStyle('#94a3b8')}
                  >
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div
                  style={{
                    borderTop: '1px solid #f1f5f9', padding: '10px 14px 14px',
                    backgroundColor: '#f8fafc', fontSize: 13, color: '#374151',
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 600, color: '#64748b' }}>Rhythmus:</span>{' '}
                    {RHYTHMUS_LABELS[abo.rhythmus] ?? `Jede ${abo.rhythmus}. Woche`}
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, color: '#64748b' }}>Wochentag:</span>{' '}
                    {ABO_WEEKDAY_LABELS[abo.wochentag]}
                  </div>
                  {abo.auftragsnummer && (
                    <div>
                      <span style={{ fontWeight: 600, color: '#64748b' }}>Auftragsnr.:</span>{' '}
                      {abo.auftragsnummer}
                    </div>
                  )}
                  {abo.notizen && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <span style={{ fontWeight: 600, color: '#64748b' }}>Notizen:</span>{' '}
                      {abo.notizen}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', border: '1px solid #d1d5db',
  borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box',
  color: '#1e293b',
};

const errorStyle: React.CSSProperties = {
  fontSize: 11, color: '#ef4444', marginTop: 2, display: 'block',
};

const btnPrimaryStyle: React.CSSProperties = {
  padding: '8px 18px', border: 'none', borderRadius: 6,
  backgroundColor: '#2563eb', color: '#fff', cursor: 'pointer',
  fontSize: 13, fontWeight: 600,
};

const btnSecondaryStyle: React.CSSProperties = {
  padding: '8px 18px', border: '1px solid #d1d5db', borderRadius: 6,
  backgroundColor: '#fff', color: '#374151', cursor: 'pointer',
  fontSize: 13, fontWeight: 500,
};

function iconBtnStyle(color: string): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 30, height: 30, border: 'none', borderRadius: 6,
    backgroundColor: 'transparent', color, cursor: 'pointer',
    transition: 'background-color 0.1s',
  };
}
