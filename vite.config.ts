import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const { PUBLIC_TUNNEL_HOST: publicTunnelHost } = loadEnv(mode, '.', '');

  return {
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
  };
});