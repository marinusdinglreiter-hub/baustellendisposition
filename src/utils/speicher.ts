/**
 * Prueft, ob der Browser ueberhaupt etwas dauerhaft speichern laesst.
 *
 * Relevant vor allem fuer die Einzeldatei-Fassung, die per Doppelklick von
 * einer file://-Adresse laeuft, und fuer private Fenster. Ohne diesen Test
 * wuerde die Tafel normal aussehen, aber beim naechsten Oeffnen waere alles
 * wieder weg - und niemand wuesste warum.
 */

let gemerkt: boolean | null = null;

export function istSpeicherVerfuegbar(): boolean {
  if (gemerkt !== null) return gemerkt;
  try {
    const schluessel = '__bsd_speichertest__';
    localStorage.setItem(schluessel, '1');
    const gelesen = localStorage.getItem(schluessel);
    localStorage.removeItem(schluessel);
    gemerkt = gelesen === '1';
  } catch {
    gemerkt = false;
  }
  return gemerkt;
}

/** Laeuft die Anwendung direkt von einer Datei statt ueber einen Webserver? */
export function laeuftAlsDatei(): boolean {
  return window.location.protocol === 'file:';
}
