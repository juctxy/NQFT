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

export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault(); // tự hiện nút của app thay vì banner mặc định
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null); // mỗi sự kiện chỉ dùng được 1 lần
  };

  return { canInstall: !!deferred && !installed, installed, install };
}
