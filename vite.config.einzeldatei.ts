import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Bau der Fassung, die als EINE HTML-Datei per Doppelklick laeuft.
 *
 * Zwei Dinge sind dabei entscheidend:
 *
 * - `format: 'iife'` statt der ueblichen Module. Chrome blockiert
 *   Modul-Skripte auf file://-Adressen; ein klassisches Skript laeuft dort
 *   ohne Murren.
 * - `inlineDynamicImports`, damit wirklich alles in einem einzigen Buendel
 *   landet. Sonst wuerde jsPDF seine Zusatzteile zur Laufzeit nachladen
 *   wollen - was aus einer einzelnen Datei heraus nicht gehen kann.
 *
 * Das eigentliche Zusammenfuegen macht danach tools/einzeldatei-bauen.mjs.
 */
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'build-einzeldatei',
    emptyOutDir: true,
    cssCodeSplit: false,
    // Bilder und Schriften direkt einbetten
    assetsInlineLimit: 100_000_000,
    rollupOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'app.js',
        assetFileNames: 'app.[ext]',
      },
    },
  },
});
