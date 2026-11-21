// Nhận diện nền tảng / trình duyệt.
// App không tự chặn sự kiện beforeinstallprompt nữa (giao diện NQFT không có nút "Cài app"),
// nên Chrome tự hiện lời mời cài app và mục "Cài đặt ứng dụng" trong menu ⋮ như mặc định.

export type Platform = 'android' | 'ios' | 'other';

export function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return 'android';
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'ios';
  }
  return 'other';
}

/** Brave có navigator.bluetooth nhưng mặc định chặn Web Bluetooth. */
export function isBraveBrowser(): boolean {
  return 'brave' in navigator;
}

/** Link mở trang hiện tại bằng Chrome trên Android. */
export function chromeIntentUrl(): string {
  const { host, pathname, search, hash } = window.location;
  return `intent://${host}${pathname}${search}${hash}#Intent;scheme=https;package=com.android.chrome;end`;
}
