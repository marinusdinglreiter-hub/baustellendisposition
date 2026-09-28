import { useSyncExternalStore } from 'react';
import { RotateCcw, TriangleAlert, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import {
  loadResetUndo,
  clearResetUndo,
  hasFreshResetUndo,
  subscribeResetUndo,
  getResetUndoRaw,
} from '../utils/snapshotManager';
import { showToast } from './Toast';

/**
 * Bewusst ein dauerhaftes Banner und kein Toast: der Toast blendet nach vier
 * Sekunden aus, viel zu kurz fuer etwas so Folgenschweres. Und es muss ein F5
 * ueberleben, weil ein versehentlicher Reset womoeglich erst am naechsten
 * Morgen auffaellt – der Zustand liegt deshalb in localStorage.
 */
export function ResetUndoBanner() {
  const restoreSnapshot = useStore((s) => s.restoreSnapshot);
  // Ueber useSyncExternalStore, damit ein Reset in derselben Sitzung sofort
  // sichtbar wird und nicht erst nach einem Reload.
  useSyncExternalStore(subscribeResetUndo, getResetUndoRaw, () => null);

  const undo = hasFreshResetUndo() ? loadResetUndo() : null;
  if (!undo) return null;

  const zeit = new Date(undo.takenAt).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  function handleUndo() {
    const u = loadResetUndo();
    if (!u) return;
    restoreSnapshot(u.data);
    clearResetUndo();
    showToast('Der Reset wurde rückgängig gemacht.', 'success');
  }

  function handleDismiss() {
    clearResetUndo();
  }

  return (
    <div
      style={{
        backgroundColor: '#fffbeb',
        borderBottom: '1px solid #fcd34d',
        padding: '8px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontSize: 13,
        color: '#92400e',
      }}
    >
      <TriangleAlert size={15} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1 }}>
        <strong>Die Daten wurden am {zeit} zurückgesetzt.</strong> Der Stand davor
        ({undo.data.baustellen.length} Baustellen, {undo.data.personnel.length} Personal,{' '}
        {undo.data.equipment.length} Geräte) lässt sich noch zurückholen.
      </span>
      <button
        onClick={handleUndo}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          border: 'none',
          borderRadius: 6,
          backgroundColor: '#b45309',
          color: '#fff',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 600,
          padding: '6px 12px',
          flexShrink: 0,
        }}
      >
        <RotateCcw size={13} />
        Reset rückgängig machen
      </button>
      <button
        onClick={handleDismiss}
        title="Hinweis verwerfen – der alte Stand ist danach weg"
        style={{
          display: 'flex',
          border: 'none',
          borderRadius: 5,
          background: 'transparent',
          color: '#b45309',
          cursor: 'pointer',
          padding: 4,
          flexShrink: 0,
        }}
      >
        <X size={15} />
      </button>
    </div>
  );
}
