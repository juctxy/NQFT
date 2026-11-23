import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Logo WUD có nền đen -> phần đệm của icon maskable / apple cũng tô đen thay vì trắng.
const black = { background: '#000000' };

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: black },
    apple: { ...minimal2023Preset.apple, resizeOptions: black },
  },
  images: ['public/logo.png'],
});
