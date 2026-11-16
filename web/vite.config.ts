/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages phục vụ tại /<tên-repo>/ -> workflow truyền BASE_PATH.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig(({ command }) => ({
  base,
  plugins: [
    react(),
    // Web Bluetooth cần HTTPS; chứng chỉ tự ký chỉ dùng khi dev.
    command === 'serve' ? basicSsl() : null,
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      pwaAssets: { config: true },
      manifest: {
        name: 'RC Car Controller',
        short_name: 'RC Car',
        description: 'Điều khiển xe RC dùng ESP32 qua Bluetooth',
        lang: 'vi',
        start_url: '.',
        scope: '.',
        display: 'fullscreen',
        display_override: ['fullscreen', 'standalone'],
        orientation: 'landscape',
        background_color: '#111318',
        theme_color: '#111318',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
      },
    }),
  ],
  server: { port: 5173 },
  test: { environment: 'node' },
}));
