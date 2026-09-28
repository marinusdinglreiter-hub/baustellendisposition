import { useState, useEffect } from 'react';

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

export interface ClockResult {
  /** z.B. "07:32 Uhr" */
  time: string;
  /** z.B. "Samstag, 05.04.2026" */
  date: string;
  /** z.B. "Samstag, 05.04.2026 – 07:32 Uhr" */
  datetime: string;
}

export function useClock(): ClockResult {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const time = `${pad(now.getHours())}:${pad(now.getMinutes())} Uhr`;

  const date = now.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return { time, date, datetime: `${date} – ${time}` };
}
