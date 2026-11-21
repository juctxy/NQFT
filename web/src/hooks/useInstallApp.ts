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
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
  return 'other';
}

/** Trình duyệt nhúng trong app khác (Zalo, Facebook, Messenger…) — không cài được app, không có Bluetooth. */
export function isInAppBrowser(): boolean {
  return /Zalo|FBAN|FBAV|FB_IAB|Instagram|Line\/|Messenger|TikTok|Snapchat|; wv\)/i.test(navigator.userAgent);
}

/** Link mở trang hiện tại bằng Chrome trên Android. */
export function chromeIntentUrl(): string {
  const { host, pathname, search } = window.location;
  return `intent://${host}${pathname}${search}#Intent;scheme=https;package=com.android.chrome;end`;
}

/** Địa chỉ app (bỏ phần #/settings). */
export function appUrl(): string {
  return window.location.origin + window.location.pathname;
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true // iOS
  );
}

// Bắt sự kiện ngay khi module nạp — beforeinstallprompt có thể đến trước khi React render.
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((cb) => cb());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // dùng nút TẢI APP trong Settings thay cho banner mặc định
    deferredPrompt = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installed = true;
    notify();
  });
}

export function useInstallApp() {
  const [, force] = useState(0);
  const [standalone] = useState(isStandalone);

  useEffect(() => {
    const cb = () => force((n) => n + 1);
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }, []);

  /** Mở hộp thoại cài của Chrome/Edge. Trả về true nếu người dùng đồng ý. */
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
    /** Đang chạy trong app đã cài. */
    standalone,
    /** Vừa cài xong trong phiên này. */
    installed,
    /** Chrome/Edge cho phép hiện hộp thoại cài trực tiếp. */
    canPrompt: deferredPrompt !== null,
    install,
  };
}
