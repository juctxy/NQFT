import { useEffect, useState } from 'react';

// Sự kiện chỉ có trên Chrome/Edge (chưa nằm trong lib.dom chuẩn).
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type Platform = 'android' | 'ios' | 'other';

export function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return 'android';
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'ios';
  }
  return 'other';
}

/** Trình duyệt nhúng trong app khác (Zalo, Facebook, Messenger…) — không có Web Bluetooth. */
export function isInAppBrowser(): boolean {
  return /Zalo|FBAN|FBAV|FB_IAB|Instagram|Line\/|Messenger|TikTok|Snapchat|; wv\)/i.test(navigator.userAgent);
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

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    // iOS Safari
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// Bắt sự kiện ngay khi module được nạp — beforeinstallprompt có thể đến trước khi React render.
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let justInstalled = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((cb) => cb());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // tự hiện nút của app thay vì banner mặc định
    deferredPrompt = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    justInstalled = true;
    notify();
  });
}

export function useInstallPrompt() {
  const [, force] = useState(0);
  const [standalone] = useState(isStandalone);

  useEffect(() => {
    const cb = () => force((n) => n + 1);
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }, []);

  /** true nếu Chrome cho phép hiện hộp thoại cài trực tiếp; false -> phải hướng dẫn cài bằng menu. */
  const canPrompt = !!deferredPrompt;

  const install = async (): Promise<boolean> => {
    const ev = deferredPrompt;
    if (!ev) return false;
    deferredPrompt = null; // mỗi sự kiện chỉ dùng được 1 lần
    notify();
    await ev.prompt();
    const { outcome } = await ev.userChoice;
    return outcome === 'accepted';
  };

  return {
    /** Đang chạy trong app đã cài (không phải tab trình duyệt). */
    standalone,
    /** Vừa cài xong trong phiên này. */
    justInstalled,
    canPrompt,
    install,
  };
}
