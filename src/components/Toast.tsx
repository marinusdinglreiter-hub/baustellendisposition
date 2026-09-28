import { useState, useEffect, useCallback } from 'react';
import { Ban, Info, CircleCheck } from 'lucide-react';

export type ToastType = 'error' | 'info' | 'success';

interface ToastMessage {
  id: number;
  text: string;
  type: ToastType;
}

// Solange es nur Fehlermeldungen gab, war ein Verbotszeichen fuer alle
// richtig. Seit es auch Erfolgsmeldungen gibt ("Plan abgelegt"), braucht
// jede Art ihr eigenes Symbol – sonst liest sich eine Bestaetigung wie ein
// Fehler.
const TOAST_STYLE: Record<ToastType, { bg: string; Icon: typeof Ban }> = {
  error: { bg: '#dc2626', Icon: Ban },
  info: { bg: '#2563eb', Icon: Info },
  success: { bg: '#059669', Icon: CircleCheck },
};

let toastCounter = 0;
let addToastFn: ((text: string, type?: ToastType) => void) | null = null;

/** Zeigt einen Toast von überall im Code an. */
export function showToast(text: string, type: ToastType = 'error') {
  if (addToastFn) {
    addToastFn(text, type);
  }
}

export function ToastContainer() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const addToast = useCallback((text: string, type: ToastType = 'error') => {
    const id = ++toastCounter;
    setMessages((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setMessages((prev) => prev.filter((m) => m.id !== id));
    }, 4000);
  }, []);

  useEffect(() => {
    addToastFn = addToast;
    return () => { addToastFn = null; };
  }, [addToast]);

  if (messages.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxWidth: 500,
        width: '90%',
      }}
    >
      {messages.map((m) => {
        const { bg, Icon } = TOAST_STYLE[m.type] ?? TOAST_STYLE.error;
        return (
        <div
          key={m.id}
          style={{
            backgroundColor: bg,
            color: '#fff',
            padding: '12px 18px',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 500,
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            animation: 'toast-in 0.25s ease-out',
          }}
        >
          <Icon size={18} style={{ flexShrink: 0 }} />
          <span>{m.text}</span>
        </div>
        );
      })}
    </div>
  );
}
