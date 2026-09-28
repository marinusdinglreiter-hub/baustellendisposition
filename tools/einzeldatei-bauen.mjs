/**
 * Fuegt das Ergebnis von `vite build --config vite.config.einzeldatei.ts`
 * zu EINER HTML-Datei zusammen, die sich per Doppelklick oeffnen laesst.
 *
 * Gedacht zum Verschicken per E-Mail, wenn ZIP-Anhaenge gesperrt sind.
 * Ohne lokalen Webserver sperrt Chrome die Browser-Datenbank; in dieser
 * Fassung lassen sich deshalb keine PDF-Plaene ablegen. Alles andere
 * funktioniert, weil es im localStorage liegt - und der ist auf file://
 * erlaubt.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = dirname(fileURLToPath(import.meta.url));
const projekt = join(hier, '..');
const bau = join(projekt, 'build-einzeldatei');
const ziel = join(projekt, 'Baustellendisposition.html');

if (!existsSync(bau)) {
  console.error('Der Ordner build-einzeldatei fehlt. Zuerst den Vite-Bau laufen lassen.');
  process.exit(1);
}

let html = readFileSync(join(bau, 'index.html'), 'utf8');
const js = readFileSync(join(bau, 'app.js'), 'utf8');

const cssPfad = join(bau, 'app.css');
const css = existsSync(cssPfad) ? readFileSync(cssPfad, 'utf8') : '';

// Favicon als Daten-URI einbetten, damit keine zweite Datei noetig ist
const faviconPfad = join(bau, 'favicon.svg');
if (existsSync(faviconPfad)) {
  const svg = readFileSync(faviconPfad, 'utf8');
  const daten = 'data:image/svg+xml;base64,' + Buffer.from(svg, 'utf8').toString('base64');
  html = html.replace(/href="\.\/favicon\.svg"/, `href="${daten}"`);
}

/**
 * Ein `</script>` im Programmtext wuerde das umschliessende Skript-Element
 * vorzeitig beenden. Der Browser liest die Folge rein textuell, noch bevor
 * JavaScript ueberhaupt geparst wird - die uebliche Absicherung ist deshalb,
 * den Schraegstrich zu maskieren. Innerhalb von JavaScript-Zeichenketten ist
 * `<\/script>` gleichbedeutend mit `</script>`.
 */
const jsSicher = js.replace(/<\/script/gi, '<\\/script');

// Das gebaute Stylesheet und Skript durch ihre Inhalte ersetzen.
//
// ACHTUNG: der Ersatztext MUSS als Funktion uebergeben werden. Als
// Zeichenkette deutet String.replace Folgen wie $& und $' als Platzhalter -
// und das React-Buendel enthaelt "$&/". Mit einer Zeichenkette wuerde dort
// mitten im Programmtext das gefundene Skript-Tag eingesetzt und die
// Anwendung waere stillschweigend kaputt. Eine Funktion schaltet diese
// Deutung ab.
html = html.replace(/<link[^>]+rel="stylesheet"[^>]*>/i, () =>
  css ? `<style>\n${css}\n</style>` : ''
);
// Das Skript wandert dabei aus dem <head> ans Ende des <body>.
// Vite legt es als type="module" in den Kopf, und Modul-Skripte werden
// grundsaetzlich verzoegert ausgefuehrt. Ein klassisches Skript - und nur
// das laeuft auf file://-Adressen - wuerde dagegen sofort beim Parsen des
// Kopfes starten, also bevor es <div id="root"> ueberhaupt gibt.
const scriptTag = /<script[^>]*src="\.\/app\.js"[^>]*><\/script>\s*/i;
if (!scriptTag.test(html)) {
  console.error('Das erwartete Skript-Tag wurde nicht gefunden - der Bau stimmt nicht.');
  process.exit(1);
}
html = html.replace(scriptTag, () => '');
html = html.replace('</body>', () => `  <script>\n${jsSicher}\n  </script>\n  </body>`);

// Hinweis in den Kopf, damit man der Datei ansieht, was sie ist
html = html.replace(
  '</head>',
  '    <meta name="description" content="Baustellendisposition – Einzeldatei-Fassung ohne Plan-Ablage" />\n  </head>'
);

// Gezielt auf uebrig gebliebene VERWEISE pruefen, nicht auf die blosse
// Zeichenfolge: der eingebettete Programmtext enthaelt "app.js" selbst.
const uebrig = [/src="[^"]*app\.js"/i, /href="[^"]*app\.css"/i].filter((r) => r.test(html));
if (uebrig.length > 0) {
  console.error('Es sind noch Verweise auf externe Dateien uebrig - der Bau stimmt nicht.');
  console.error(uebrig.map((r) => String(r)).join(', '));
  process.exit(1);
}

writeFileSync(ziel, html, 'utf8');

const mb = (Buffer.byteLength(html, 'utf8') / 1024 / 1024).toFixed(2);
console.log('');
console.log('  Einzeldatei fertig:');
console.log(`    ${ziel}  (${mb} MB)`);
console.log('');
console.log('  Laesst sich per Doppelklick oeffnen und als Anhang verschicken.');
console.log('  In dieser Fassung lassen sich keine PDF-Plaene ablegen.');
console.log('');
