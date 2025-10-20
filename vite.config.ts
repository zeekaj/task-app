import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [react(), visualizer({ filename: 'dist/stats.html', open: false })],
  server: { host: true, port: 5173, strictPort: true },
  preview: { host: true, port: 5173, strictPort: true },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('firebase/firestore')) return 'vendor-firebase-firestore';
            if (id.includes('firebase/auth')) return 'vendor-firebase-auth';
            if (id.includes('firebase/storage')) return 'vendor-firebase-storage';
            if (id.includes('firebase')) return 'vendor-firebase';
            return 'vendor';
          }
          // Optionally separate large internal modules
          if (id.includes('/src/services/')) return 'services';
        },
      },
    },
  },
});
