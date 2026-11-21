// Bảng "Tải app về máy" trong Settings: cài PWA trên Android, hướng dẫn Bluefy trên iPhone/iPad.
import { useEffect, useState, type ReactNode } from 'react';
import { Download, X } from 'lucide-react';
import { appUrl, chromeIntentUrl, detectPlatform, isInAppBrowser, useInstallApp } from '../hooks/useInstallApp';
import { Pressable, Text, View, type Style } from '../ui/rn';

const APK_URL = 'https://github.com/quanhuy38/NQFT/releases/latest';
const BLUEFY_URL = 'https://apps.apple.com/app/bluefy-web-ble-browser/id1492822055';

type Tab = 'android' | 'ios';

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <View style={s.step}>
      <View style={s.badge}>
        <Text style={s.badgeText}>{n}</Text>
      </View>
      <Text style={s.stepText}>{children}</Text>
    </View>
  );
}

function LinkButton({ href, primary, children }: { href: string; primary?: boolean; children: ReactNode }) {
  return (
    <a href={href} target={href.startsWith('intent:') ? undefined : '_blank'} rel="noreferrer" className="rn-v" style={{ ...s.button, ...(primary ? s.primary : s.secondary), textDecoration: 'none' }}>
      <Text style={primary ? s.primaryText : s.secondaryText}>{children}</Text>
    </a>
  );
}

const b = (t: string) => <Text style={s.bold}>{t}</Text>;

export function InstallAppSheet({ onClose }: { onClose: () => void }) {
  const platform = detectPlatform();
  const [tab, setTab] = useState<Tab>(platform === 'ios' ? 'ios' : 'android');
  const { canPrompt, installed, install } = useInstallApp();
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const inApp = platform === 'android' && isInAppBrowser();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(appUrl());
      setCopied(true);
    } catch {
      window.prompt('Sao chép link app:', appUrl());
    }
  };

  return (
    <View style={s.overlay} role="dialog" aria-modal="true" onClick={onClose}>
      <View style={s.panel} onClick={(e) => e.stopPropagation()}>
        <View style={s.header}>
          <View style={s.titleRow}>
            <Download color="#f47518" size={20} />
            <Text style={s.title}>TẢI APP VỀ MÁY</Text>
          </View>
          <Pressable label="Đóng" onPress={onClose} style={s.closeButton}>
            <X color="#06324d" size={20} />
          </Pressable>
        </View>

        <View style={s.tabs}>
          {(['android', 'ios'] as const).map((t) => (
            <Pressable key={t} selected={tab === t} onPress={() => setTab(t)} style={[s.tabButton, tab === t && s.tabButtonSelected]}>
              <Text style={[s.tabText, tab === t && s.tabTextSelected]}>{t === 'android' ? 'Android' : 'iPhone / iPad'}</Text>
            </Pressable>
          ))}
        </View>

        <View style={s.body}>
          {installed ? <Text style={s.success}>Đã cài xong — mở app "RC Car" từ màn hình chính.</Text> : null}

          {tab === 'android' ? (
            <>
              {canPrompt ? (
                <Pressable
                  onPress={async () => {
                    const ok = await install();
                    setMessage(ok ? null : 'Chưa cài. Bạn có thể cài lại bằng menu ⋮ của Chrome (các bước bên dưới).');
                  }}
                  style={[s.button, s.primary]}
                >
                  <Download color="#fff" size={16} />
                  <Text style={s.primaryText}>Cài đặt ngay</Text>
                </Pressable>
              ) : null}
              {inApp ? <LinkButton href={chromeIntentUrl()} primary>Mở bằng Chrome</LinkButton> : null}
              <Step n={1}>Mở link app bằng {b('Google Chrome')} (không mở trong Zalo / Facebook / Messenger).</Step>
              <Step n={2}>Bấm menu {b('⋮')} góc trên bên phải → {b('Cài đặt ứng dụng')} (hoặc {b('Thêm vào màn hình chính')}) → {b('Cài đặt')}.</Step>
              <Step n={3}>Mở {b('RC Car')} từ màn hình chính. App tự cập nhật và chạy được khi không có mạng.</Step>
              <Text style={s.hint}>Hoặc cài bằng file APK (cho phép "cài từ nguồn không xác định" khi được hỏi).</Text>
              <LinkButton href={APK_URL}>Tải file APK</LinkButton>
            </>
          ) : (
            <>
              <Text style={s.note}>
                Safari và mọi trình duyệt trên iPhone/iPad đều không cho web dùng Bluetooth, nên app chạy trong {b('Bluefy')} (miễn phí).
              </Text>
              <Step n={1}>Tải {b('Bluefy – Web BLE Browser')} trên App Store.</Step>
              <LinkButton href={BLUEFY_URL} primary>Tải Bluefy trên App Store</LinkButton>
              <Step n={2}>Mở Bluefy, dán link app vào thanh địa chỉ:</Step>
              <Pressable onPress={copyLink} style={s.urlBox}>
                <Text style={s.urlText}>{appUrl()}</Text>
                <Text style={s.copyText}>{copied ? 'Đã chép' : 'Chép link'}</Text>
              </Pressable>
              <Step n={3}>Bấm biểu tượng {b('☆')} để lưu bookmark — lần sau mở app nhanh từ Bluefy.</Step>
            </>
          )}

          {message ? <Text style={s.warning}>{message}</Text> : null}
        </View>

        <View style={s.footer}>
          <Pressable onPress={onClose} style={s.doneButton}>
            <Text style={s.doneButtonText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const s: Record<string, Style> = {
  overlay: { alignItems: 'center', backgroundColor: 'rgba(2, 20, 32, 0.62)', bottom: 0, justifyContent: 'center', left: 0, padding: 16, position: 'fixed', right: 0, top: 0, zIndex: 50 },
  panel: { backgroundColor: '#fff', borderRadius: 12, maxHeight: '100%', maxWidth: 480, padding: 16, width: '100%', overflowY: 'auto' },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  titleRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  title: { color: '#06324d', fontSize: 16, fontWeight: 800 },
  closeButton: { alignItems: 'center', height: 36, justifyContent: 'center', width: 36 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tabButton: { alignItems: 'center', backgroundColor: '#f1f5f9', borderColor: '#cbd5e1', borderRadius: 8, borderWidth: 1, flex: '1 1 0%', justifyContent: 'center', minHeight: 38 },
  tabButtonSelected: { backgroundColor: '#06324d', borderColor: '#06324d' },
  tabText: { color: '#334155', fontSize: 12, fontWeight: 800 },
  tabTextSelected: { color: '#fff' },
  body: { gap: 10 },
  step: { alignItems: 'flex-start', flexDirection: 'row', gap: 8 },
  badge: { alignItems: 'center', backgroundColor: '#06324d', borderRadius: 11, height: 22, justifyContent: 'center', width: 22 },
  badgeText: { color: '#f47518', fontSize: 12, fontWeight: 800 },
  stepText: { color: '#475569', flex: '1 1 0%', fontSize: 12.5, lineHeight: '18.75px', paddingTop: 2 },
  bold: { color: '#06324d', fontWeight: 700 },
  note: { backgroundColor: '#fff7ed', borderRadius: 8, color: '#9a3412', fontSize: 12, lineHeight: '18px', padding: 10 },
  hint: { color: '#64748b', fontSize: 11, lineHeight: '16px' },
  success: { backgroundColor: '#f0fdf4', borderRadius: 8, color: '#166534', fontSize: 12, fontWeight: 700, padding: 10 },
  warning: { color: '#b45309', fontSize: 11, fontWeight: 600 },
  button: { alignItems: 'center', borderRadius: 8, flexDirection: 'row', gap: 6, justifyContent: 'center', minHeight: 40, paddingLeft: 12, paddingRight: 12 },
  primary: { backgroundColor: '#f47518' },
  primaryText: { color: '#fff', fontSize: 12, fontWeight: 800 },
  secondary: { backgroundColor: '#e2e8f0' },
  secondaryText: { color: '#06324d', fontSize: 12, fontWeight: 800 },
  urlBox: { alignItems: 'center', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, flexDirection: 'row', gap: 8, justifyContent: 'space-between', minHeight: 40, padding: '6px 10px' },
  urlText: { color: '#06324d', flex: '1 1 0%', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: 11, overflowWrap: 'anywhere' },
  copyText: { color: '#c2410c', fontSize: 11, fontWeight: 800 },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 },
  doneButton: { alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 6, justifyContent: 'center', minHeight: 40, minWidth: 72 },
  doneButtonText: { color: '#06324d', fontWeight: 700 },
};
