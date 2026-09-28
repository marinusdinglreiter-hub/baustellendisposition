import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { TVView } from './components/tv/TVView.tsx';

// ─── Route detection (no router needed for two-page app) ─────────────────────
// Neben dem Pfad wird auch die Raute erkannt. Der Pfad braucht einen Server,
// der unbekannte Adressen auf index.html zurueckfaellt; die Raute funktioniert
// mit jedem beliebigen Server und bleibt deshalb der Weg, den der
// Hallenansicht-Knopf benutzt. Der Pfad bleibt fuer alte Lesezeichen drin.
const path = window.location.pathname;
const hash = window.location.hash.replace(/^#\/?/, '');
const isTVMode =
  path === '/tv' ||
  path === '/hallenansicht' ||
  path.endsWith('/tv') ||
  path.endsWith('/hallenansicht') ||
  hash === 'tv' ||
  hash === 'hallenansicht';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isTVMode ? <TVView /> : <App />}
  </StrictMode>
);
