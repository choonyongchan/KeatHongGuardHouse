import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import mkcert from 'vite-plugin-mkcert';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    process.env.HTTPS ? mkcert() : null,
  ],
  resolve: {
    // Native Vite 8 tsconfig paths — replaces vite-tsconfig-paths plugin.
    tsconfigPaths: true,
  },
  build: {
    target: 'esnext',
  },
  server: {
    host: true,
  },
});
