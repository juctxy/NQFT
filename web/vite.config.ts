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
      // Các trường PWABuilder kiểm tra (bắt buộc + khuyến nghị). Icons do pwaAssets tự thêm.
      manifest: {
        id: base, // định danh cố định của app (GitHub Pages: /NQFT/)
        name: 'RC Car Controller',
        short_name: 'RC Car',
        description: 'Điều khiển xe RC dùng ESP32 qua Bluetooth Low Energy, ngay trên trình duyệt điện thoại.',
        lang: 'vi',
        dir: 'ltr',
        start_url: '.',
        scope: '.',
        display: 'fullscreen',
        display_override: ['fullscreen', 'standalone'],
        orientation: 'landscape',
        background_color: '#041518',
        theme_color: '#041518',
        categories: ['utilities', 'entertainment'],
        prefer_related_applications: false,
        launch_handler: { client_mode: 'focus-existing' },
        handle_links: 'preferred',
        screenshots: [
          {
            src: 'screenshots/wide.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Màn hình điều khiển xe trên máy tính',
          },
          {
            src: 'screenshots/narrow.png',
            sizes: '412x732',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Màn hình điều khiển xe trên điện thoại',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
      },
    }),
  ],
  server: { port: 5173 },
  test: { environment: 'node' },
}));
