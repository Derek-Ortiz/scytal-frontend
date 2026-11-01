import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Dentro del contenedor de desarrollo (docker compose up dev) los
// volúmenes montados en Windows/macOS no emiten eventos del sistema
// de archivos de forma fiable: se fuerza el polling del watcher.
const isDocker = process.env.VITE_DOCKER === '1';

// https://vitejs.dev/config/
export default defineConfig({
  // Base relativa: el build funciona en la raíz o en subcarpetas del hosting.
  base: './',
  plugins: [react(), tailwindcss()],
  ...(isDocker
    ? {
        server: {
          host: '0.0.0.0',
          strictPort: true,
          watch: { usePolling: true, interval: 400 },
        },
      }
    : {}),
});
