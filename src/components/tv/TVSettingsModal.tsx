import { X, RotateCcw } from 'lucide-react';
import type { TVSettings } from '../../types/tvSettings';

interface Props {
  settings: TVSettings;
  onUpdateSection: <K extends keyof TVSettings>(section: K, updates: Partial<TVSettings[K]>) => void;
  onReset: () => void;
  onClose: () => void;
}

export function TVSettingsModal({ settings, onUpdateSection, onReset, onClose }: Props) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)',
          zIndex: 200, backdropFilter: 'blur(2px)',
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 480, maxHeight: '88vh', overflowY: 'auto',
          backgroundColor: '#1e293b', color: '#e2e8f0',
          borderRadius: 14, zIndex: 201,
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)',
            position: 'sticky', top: 0, backgroundColor: '#1e293b', zIndex: 1,
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: 0.2 }}>
            Hallenansicht – Einstellungen
          </span>
          <button onClick={onClose} style={iconBtn}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '18px 20px 22px', display: 'flex', flexDirection: 'column', gap: 22 }}>

          {/* ── ANZEIGE ───────────────────────────────────────────────────── */}
          <Section title="Anzeige">
            <Toggle label="Uhrzeit anzeigen"
              checked={settings.anzeige.uhrzeit}
              onChange={(v) => onUpdateSection('anzeige', { uhrzeit: v })} />
            <Toggle label="Datum anzeigen"
              checked={settings.anzeige.datum}
              onChange={(v) => onUpdateSection('anzeige', { datum: v })} />
            <Toggle label="Rolle des Mitarbeiters anzeigen"
              checked={settings.anzeige.mitarbeiterRolle}
              onChange={(v) => onUpdateSection('anzeige', { mitarbeiterRolle: v })} />
            <Toggle label="Fahrzeug-Kennzeichen anzeigen"
              checked={settings.anzeige.kennzeichen}
              onChange={(v) => onUpdateSection('anzeige', { kennzeichen: v })} />
            <Toggle label="Maschinenbezeichnung anzeigen"
              checked={settings.anzeige.maschinenbezeichnung}
              onChange={(v) => onUpdateSection('anzeige', { maschinenbezeichnung: v })} />
            <Toggle label="Leere Baustellen anzeigen"
              checked={settings.anzeige.leereBaustellen}
              onChange={(v) => onUpdateSection('anzeige', { leereBaustellen: v })} />
            <Toggle label="Notizen anzeigen"
              checked={settings.anzeige.notizen}
              onChange={(v) => onUpdateSection('anzeige', { notizen: v })} />
            <Toggle label="Abgelegte Pläne anzeigen"
              checked={settings.anzeige.dateien}
              onChange={(v) => onUpdateSection('anzeige', { dateien: v })} />
          </Section>

          {/* ── AUTOMATISCHES DURCHBLAETTERN ──────────────────────────────── */}
          <Section title="Automatisches Durchblaettern">
            <Toggle label="Automatisch durchblaettern"
              checked={settings.blaettern.aktiv}
              onChange={(v) => onUpdateSection('blaettern', { aktiv: v })} />
            {settings.blaettern.aktiv && (
              <SliderField
                label={`Intervall: ${settings.blaettern.intervallSekunden} Sekunden`}
                value={settings.blaettern.intervallSekunden}
                min={3} max={30} step={1}
                onChange={(v) => onUpdateSection('blaettern', { intervallSekunden: v })} />
            )}
            <Toggle label="Sanfter Fade-Uebergang beim Blaettern"
              checked={settings.blaettern.fadeUebergang}
              onChange={(v) => onUpdateSection('blaettern', { fadeUebergang: v })} />
            <Toggle label='Seitenanzahl anzeigen ("Seite 1 / 2")'
              checked={settings.blaettern.seitenanzahl}
              onChange={(v) => onUpdateSection('blaettern', { seitenanzahl: v })} />
          </Section>

          {/* ── LIVE-AKTUALISIERUNG ───────────────────────────────────────── */}
          <Section title="Live-Aktualisierung">
            <Toggle label="Live-Aktualisierung aktiv"
              checked={settings.live.aktiv}
              onChange={(v) => onUpdateSection('live', { aktiv: v })} />
            <Toggle label="Visuelles Feedback bei Aenderungen"
              checked={settings.live.visuellosFeedback}
              onChange={(v) => onUpdateSection('live', { visuellosFeedback: v })} />
            <Toggle label="Verbindungsstatus anzeigen (gruener Punkt)"
              checked={settings.live.verbindungsdot}
              onChange={(v) => onUpdateSection('live', { verbindungsdot: v })} />
            <SliderField
              label={`Heartbeat-Timeout: ${settings.live.pollingIntervall} Sekunden`}
              value={settings.live.pollingIntervall}
              min={5} max={60} step={5}
              onChange={(v) => onUpdateSection('live', { pollingIntervall: v })} />
          </Section>

          {/* ── DARSTELLUNG ───────────────────────────────────────────────── */}
          <Section title="Darstellung">
            <RadioGroup
              label="Hintergrundfarbe"
              options={[
                { value: 'schwarz',    label: 'Schwarz' },
                { value: 'dunkelgrau', label: 'Dunkelgrau' },
              ]}
              value={settings.darstellung.hintergrund}
              onChange={(v) => onUpdateSection('darstellung', {
                hintergrund: v as TVSettings['darstellung']['hintergrund'],
              })} />
            <SliderField
              label={`Schriftgroesse: ${settings.darstellung.schriftgroesse}%`}
              value={settings.darstellung.schriftgroesse}
              min={75} max={150} step={5}
              onChange={(v) => onUpdateSection('darstellung', { schriftgroesse: v })} />
            <RadioGroup
              label="Schriftfarbe"
              options={[
                { value: 'weiss',    label: 'Weiss' },
                { value: 'hellgrau', label: 'Hellgrau' },
              ]}
              value={settings.darstellung.schriftfarbe}
              onChange={(v) => onUpdateSection('darstellung', {
                schriftfarbe: v as TVSettings['darstellung']['schriftfarbe'],
              })} />
            <Toggle label="Trennlinien sichtbar"
              checked={settings.darstellung.trennlinien}
              onChange={(v) => onUpdateSection('darstellung', { trennlinien: v })} />
          </Section>

          {/* ── SONSTIGES ─────────────────────────────────────────────────── */}
          <Section title="Sonstiges">
            <Toggle label="Cursor auf TV-Ansicht verstecken"
              checked={settings.sonstiges.cursorVerstecken}
              onChange={(v) => onUpdateSection('sonstiges', { cursorVerstecken: v })} />
            <Toggle label="Vollbild automatisch aktivieren"
              checked={settings.sonstiges.vollbildAuto}
              onChange={(v) => onUpdateSection('sonstiges', { vollbildAuto: v })} />
            <Toggle label="QR-Code zur TV-URL einblenden"
              checked={settings.sonstiges.qrCode}
              onChange={(v) => onUpdateSection('sonstiges', { qrCode: v })} />
          </Section>

          {/* ── Footer ────────────────────────────────────────────────────── */}
          <div
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              paddingTop: 4,
            }}
          >
            <button
              onClick={() => { if (window.confirm('Alle Einstellungen zuruecksetzen?')) onReset(); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 13px', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 7, background: 'transparent', color: '#64748b',
                cursor: 'pointer', fontSize: 12, fontFamily: 'inherit',
              }}
            >
              <RotateCcw size={12} />
              Einstellungen zuruecksetzen
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '7px 18px', border: 'none', borderRadius: 7,
                background: '#2563eb', color: '#fff', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
              }}
            >
              Schliessen
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Sub-Komponenten ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: 10, fontWeight: 700, letterSpacing: 1.4,
          color: '#475569', textTransform: 'uppercase',
          marginBottom: 10, paddingBottom: 7,
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {children}
      </div>
    </div>
  );
}

function Toggle({
  label, checked, onChange,
}: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        cursor: 'pointer', gap: 12,
      }}
    >
      <span style={{ fontSize: 13, color: '#cbd5e1', flex: 1 }}>{label}</span>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 38, height: 21, borderRadius: 11, flexShrink: 0,
          backgroundColor: checked ? '#2563eb' : '#334155',
          position: 'relative', transition: 'background-color 0.18s', cursor: 'pointer',
        }}
      >
        <div
          style={{
            position: 'absolute', top: 2.5, left: checked ? 19 : 2.5,
            width: 16, height: 16, borderRadius: '50%',
            backgroundColor: '#fff', transition: 'left 0.18s',
          }}
        />
      </div>
    </label>
  );
}

function SliderField({
  label, value, min, max, step, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ paddingLeft: 2 }}>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>{label}</div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: '#2563eb', cursor: 'pointer' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#334155', marginTop: 2 }}>
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  );
}

function RadioGroup({
  label, options, value, onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 7 }}>{label}</div>
      <div style={{ display: 'flex', gap: 7 }}>
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              style={{
                padding: '4px 14px', borderRadius: 6, fontSize: 12,
                cursor: 'pointer', fontFamily: 'inherit',
                border: `1px solid ${active ? '#2563eb' : 'rgba(255,255,255,0.1)'}`,
                backgroundColor: active ? '#2563eb' : 'transparent',
                color: active ? '#fff' : '#64748b',
                fontWeight: active ? 600 : 400,
                transition: 'all 0.15s',
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 30, height: 30, border: 'none', borderRadius: 6,
  backgroundColor: 'rgba(255,255,255,0.05)', color: '#64748b',
  cursor: 'pointer',
};
