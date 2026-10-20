import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    base: '/',
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // Triggering a fresh build after DNS verification
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      modulePreload: {
        resolveDependencies(filename, deps, { hostId, hostType }) {
          if (hostType === 'html' && /jinro-counseling/.test(`${filename}\0${hostId}`)) {
            return deps.filter((dep) => !/(^|\/)fb-(app|auth|firestore|storage)-/.test(dep));
          }
          return deps;
        },
      },
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          counseling: path.resolve(__dirname, 'jinro-counseling/index.html'),
        },
        output: {
          hoistTransitiveImports: false,
          manualChunks(id) {
            if (id.includes('src/lib/firestoreApi')) return 'firestore-api';
            if (!id.includes('node_modules')) return;
            if (id.includes('firebase') || id.includes('@firebase')) {
              if (id.includes('firestore')) return 'fb-firestore';
              if (id.includes('storage')) return 'fb-storage';
              if (id.includes('auth')) return 'fb-auth';
              return 'fb-app';
            }
          },
        },
      },
    },
  };
});
