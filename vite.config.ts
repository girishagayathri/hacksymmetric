import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const publicTunnelHost = process.env.PUBLIC_TUNNEL_HOST;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: publicTunnelHost ? [publicTunnelHost] : [],
    proxy: {
      '/api': 'http://127.0.0.1:3001',
      '/ai': {
        target: 'http://127.0.0.1:8000',
        rewrite: (path) => path.replace(/^\/ai/, ''),
      },
    },
  },
});