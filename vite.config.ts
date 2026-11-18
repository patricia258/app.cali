import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { isPublicSupabaseKey } from './src/api/environment';

export default defineConfig(({ mode }) => {
  const { VITE_SUPABASE_PUBLISHABLE_KEY: key } = loadEnv(mode, process.cwd(), 'VITE_');
  if (key && !isPublicSupabaseKey(key)) {
    throw new Error('VITE_SUPABASE_PUBLISHABLE_KEY deve conter somente uma chave pública.');
  }

  return {
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
  };
});
