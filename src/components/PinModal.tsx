import { useEffect, useRef, useState } from 'react';
import { LockKeyhole, X } from 'lucide-react';
import { useStore } from '../store/useStore';

const MAX_TRIES_BEFORE_COOLDOWN = 3;
const COOLDOWN_SECONDS = 5;

/**
 * PIN-Abfrage vor der Verwaltung und vor dem Reset.
 *
 * Das ist ein Schutz gegen versehentliche Eingriffe, keine Sicherheitsfunktion
 * – siehe den Kommentar in utils/adminLock.ts.
 */
export function PinModal({
  title,
  hint,
  onSuccess,
  onCancel,
}: {
  title: string;
  hint?: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const adminPin = useStore((s) => s.adminPin);
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);
  const [tries, setTries] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  function submit() {
    if (cooldown > 0) return;
    if (value === adminPin) {
      onSuccess();
      return;
    }
    setError(true);
    setValue('');
    const next = tries + 1;
    setTries(next);
    if (next % MAX_TRIES_BEFORE_COOLDOWN === 0) setCooldown(COOLDOWN_SECONDS);
  }

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15,23,42,0.6)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#fff',
          borderRadius: 12,
          width: 'min(340px, 100%)',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0,0,0,0.35)',
        }}
      >
        <div
          style={{
            backgroundColor: '#1e293b',
            color: '#fff',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          <LockKeyhole size={15} />
          <span style={{ flex: 1 }}>{title}</span>
          <button
            onClick={onCancel}
            title="Abbrechen (Esc)"
            style={{
              display: 'flex',
              border: 'none',
              borderRadius: 5,
              background: 'rgba(255,255,255,0.15)',
              color: '#fff',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: 16 }}>
          {hint && (
            <p style={{ margin: '0 0 10px', fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
              {hint}
            </p>
          )}
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={8}
            value={value}
            placeholder="PIN"
            disabled={cooldown > 0}
            onChange={(e) => {
              setValue(e.target.value);
              setError(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '2px solid ' + (error ? '#dc2626' : '#d1d5db'),
              borderRadius: 8,
              fontSize: 18,
              letterSpacing: 6,
              textAlign: 'center',
              outline: 'none',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              backgroundColor: cooldown > 0 ? '#f1f5f9' : '#fff',
            }}
          />
          <div
            style={{
              height: 18,
              marginTop: 5,
              fontSize: 12,
              fontWeight: 600,
              color: '#dc2626',
              textAlign: 'center',
            }}
          >
            {cooldown > 0
              ? 'Zu viele Versuche – noch ' + cooldown + ' s'
              : error
                ? 'Falsche PIN'
                : ''}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              onClick={submit}
              disabled={cooldown > 0}
              style={{
                flex: 1,
                padding: '9px 12px',
                border: 'none',
                borderRadius: 7,
                backgroundColor: cooldown > 0 ? '#94a3b8' : '#2563eb',
                color: '#fff',
                cursor: cooldown > 0 ? 'default' : 'pointer',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Entsperren
            </button>
            <button
              onClick={onCancel}
              style={{
                padding: '9px 14px',
                border: '1px solid #d1d5db',
                borderRadius: 7,
                backgroundColor: '#fff',
                color: '#475569',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
