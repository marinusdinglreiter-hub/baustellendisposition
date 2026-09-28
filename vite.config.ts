import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative Pfade: so laeuft das gebaute Paket aus jedem beliebigen Ordner,
  // egal unter welchem Unterpfad es ausgeliefert wird.
  base: './',
  preview: {
    port: 5174,
  },
})
