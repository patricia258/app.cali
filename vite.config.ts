import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('@supabase')) return 'vendor-supabase';
          if (id.includes('date-fns')) return 'vendor-date';
          return 'vendor';
        },
      },
    },
  },
  server: { port: 5173 },
});
