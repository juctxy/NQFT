import { useEffect, useState } from 'react';
import { useCar } from './hooks/useCar';
import {
  chromeIntentUrl,
  detectPlatform,
  isBraveBrowser,
  isInAppBrowser,
  useInstallPrompt,
} from './hooks/useInstallPrompt';
import { isWebBluetoothSupported } from './transport/BleTransport';
import type { ConnectionState } from './transport/Transport';

const APK_URL = 'https://github.com/quanhuy38/NQFT/releases/latest';
const BLUEFY_URL = 'https://apps.apple.com/app/bluefy-web-ble-browser/id1492822055';

// Trang kiểm tra kết nối tối giản — UI lái thật sẽ thiết kế ở giai đoạn sau.

const STATE_LABEL: Record<ConnectionState, string> = {
  disconnected: 'Chưa kết nối',
  connecting: 'Đang kết nối…',
  connected: 'Đã kết nối',
  reconnecting: 'Đang kết nối lại…',
};

function UnsupportedNotice() {
  const platform = detectPlatform();
  return (
    <div className="notice">
      <strong>Trình duyệt này không hỗ trợ Bluetooth.</strong>
      {platform === 'ios' ? (
        <>
          <p>Trên iPhone/iPad: cài trình duyệt <b>Bluefy</b> (miễn phí) rồi mở lại trang này trong Bluefy.</p>
          <a className="button" href={BLUEFY_URL} target="_blank" rel="noreferrer">Tải Bluefy trên App Store</a>
        </>
      ) : platform === 'android' && isInAppBrowser() ? (
        <>
          <p>Bạn đang mở trong ứng dụng khác (Zalo, Facebook…). Hãy mở bằng <b>Chrome</b>.</p>
          <a className="button" href={chromeIntentUrl()}>Mở bằng Chrome</a>
        </>
      ) : platform === 'android' ? (
        <>
          <p>Hãy mở trang này bằng <b>Chrome</b>, hoặc cài file APK.</p>
          <div className="row">
            <a className="button" href={chromeIntentUrl()}>Mở bằng Chrome</a>
            <a className="button secondary" href={APK_URL} target="_blank" rel="noreferrer">Tải APK</a>
          </div>
        </>
      ) : (
        <p>Hãy mở bằng <b>Chrome</b> hoặc <b>Edge</b>. Firefox và Safari không hỗ trợ.</p>
      )}
    </div>
  );
}

const STATE_HINT: Record<ConnectionState, string> = {
  disconnected: 'Chưa kết nối — chỉ nút Kết nối hoạt động. Bấm Kết nối rồi chọn xe RC-Car-XXXX.',
  connecting: 'Đang kết nối — chờ vài giây…',
  connected: 'Đã kết nối — kéo thanh Ga / Lái để gửi lệnh thử.',
  reconnecting: 'Mất kết nối — đang tự kết nối lại. Bấm Ngắt kết nối để dừng.',
};

function BraveNotice() {
  return (
    <div className="notice">
      <strong>Bạn đang dùng Brave — Brave chặn Bluetooth cho trang web.</strong>
      <p>Hãy mở app bằng <b>Google Chrome</b> (và cài app từ Chrome).</p>
      {detectPlatform() === 'android' && (
        <a className="button" href={chromeIntentUrl()}>Mở bằng Chrome</a>
      )}
    </div>
  );
}

function InstallHelp() {
  const platform = detectPlatform();
  if (platform === 'ios') {
    return (
      <ol>
        <li>Mở trang này trong <b>Bluefy</b>.</li>
        <li>Lưu trang vào bookmark của Bluefy để mở nhanh lần sau.</li>
      </ol>
    );
  }
  if (platform === 'android') {
    return (
      <>
        <ol>
          <li>Bấm menu <b>⋮</b> (góc trên bên phải Chrome).</li>
          <li>Chọn <b>Cài đặt ứng dụng</b> hoặc <b>Thêm vào màn hình chính</b> → <b>Cài đặt</b>.</li>
          <li>
            Nếu menu chỉ có <b>Mở ứng dụng</b>: app vẫn đang được cài — tìm icon <b>RC Car</b> trên màn hình chính.
            Nếu bạn vừa gỡ app, đóng hẳn Chrome, mở lại trang này rồi thử lại.
          </li>
        </ol>
        <p className="muted">
          Hoặc cài bằng file APK: <a href={APK_URL} target="_blank" rel="noreferrer">tải APK</a>.
        </p>
      </>
    );
  }
  return (
    <ol>
      <li>Bấm biểu tượng <b>Cài đặt</b> (màn hình có mũi tên) ở cuối thanh địa chỉ Chrome/Edge,</li>
      <li>hoặc menu <b>⋮ → Truyền, lưu và chia sẻ → Cài đặt trang dưới dạng ứng dụng</b>.</li>
    </ol>
  );
}

function InstallBanner() {
  const { standalone, justInstalled, canPrompt, install } = useInstallPrompt();
  const [showHelp, setShowHelp] = useState(false);

  // Đang chạy trong app đã cài -> không cần nút cài.
  if (standalone) return null;

  const onClick = async () => {
    if (canPrompt) {
      const accepted = await install();
      if (!accepted) setShowHelp(true);
    } else {
      setShowHelp((v) => !v);
    }
  };

  return (
    <div className="install">
      <div className="install-row">
        <span>
          {justInstalled
            ? <>Đã cài <b>RC Car</b> — mở app từ màn hình chính.</>
            : <>Cài <b>RC Car</b> lên màn hình chính để mở nhanh, chạy cả khi không có mạng.</>}
        </span>
        <button onClick={onClick}>{canPrompt ? '📲 Cài app' : showHelp ? 'Ẩn hướng dẫn' : '📲 Cách cài app'}</button>
      </div>
      {showHelp && <InstallHelp />}
    </div>
  );
}

function AxisSlider(props: { label: string; value: number; onChange: (v: number) => void; disabled: boolean }) {
  return (
    <label className="slider">
      <span>
        {props.label}: <b>{props.value}</b>
      </span>
      <input
        type="range"
        min={-100}
        max={100}
        value={props.value}
        disabled={props.disabled}
        onChange={(e) => props.onChange(Number(e.target.value))}
        // Thả tay -> tự về 0 (giống joystick)
        onPointerUp={() => props.onChange(0)}
        onPointerCancel={() => props.onChange(0)}
      />
    </label>
  );
}

export default function App() {
  const { status, telemetry, telemetryAt, connect, disconnect, controlLoop } = useCar();
  const [throttle, setThrottle] = useState(0);
  const [steering, setSteering] = useState(0);
  const [stats, setStats] = useState(controlLoop.getStats());
  const supported = isWebBluetoothSupported();
  const connected = status.state === 'connected';
  const busy = status.state === 'connecting' || status.state === 'reconnecting';

  useEffect(() => controlLoop.setInput({ throttle, steering }), [controlLoop, throttle, steering]);

  useEffect(() => {
    if (!connected) {
      setThrottle(0);
      setSteering(0);
    }
  }, [connected]);

  useEffect(() => {
    const id = setInterval(() => setStats(controlLoop.getStats()), 500);
    return () => clearInterval(id);
  }, [controlLoop]);

  return (
    <main>
      <h1>RC Car — Kiểm tra kết nối</h1>

      {!supported && <UnsupportedNotice />}
      {supported && isBraveBrowser() && <BraveNotice />}
      {supported && !isBraveBrowser() && <InstallBanner />}

      <section className="card">
        <div className={`state state-${status.state}`}>{STATE_LABEL[status.state]}</div>
        <div className="hint">{STATE_HINT[status.state]}</div>
        {status.deviceName && <div>Thiết bị: {status.deviceName}</div>}
        {status.error && <div className="error">{status.error}</div>}
        {(status.errorCode === 'disabled' || status.errorCode === 'unsupported') &&
          detectPlatform() === 'android' && !isBraveBrowser() && (
            <a className="button" href={chromeIntentUrl()}>Mở bằng Chrome</a>
          )}
        <div className="row">
          {/* Không khóa khi trình duyệt thiếu Bluetooth: bấm vẫn hiện lý do thay vì "không có gì xảy ra". */}
          <button onClick={connect} disabled={status.state !== 'disconnected'}>
            Kết nối
          </button>
          <button onClick={disconnect} disabled={status.state === 'disconnected'}>
            Ngắt kết nối
          </button>
        </div>
        {busy && <div className="muted">Đang chờ ESP32…</div>}
      </section>

      <section className="card">
        <h2>Lệnh thử</h2>
        <AxisSlider label="Ga" value={throttle} onChange={setThrottle} disabled={!connected} />
        <AxisSlider label="Lái" value={steering} onChange={setSteering} disabled={!connected} />
        <div className="muted">
          seq {stats.seq} · đã gửi {stats.sent} · bỏ qua {stats.skipped}
        </div>
      </section>

      <section className="card">
        <h2>Telemetry</h2>
        {telemetry ? (
          <ul>
            <li>Pin: {telemetry.batteryMv ? `${(telemetry.batteryMv / 1000).toFixed(2)} V` : 'chưa có cảm biến'}</li>
            <li>Failsafe: {telemetry.failsafe ? 'ĐANG DỪNG' : 'bình thường'}</li>
            <li>Gói cuối xe nhận: seq {telemetry.lastSeq}</li>
            <li className="muted">Cập nhật lúc {telemetryAt ? new Date(telemetryAt).toLocaleTimeString() : '-'}</li>
          </ul>
        ) : (
          <div className="muted">Chưa có dữ liệu</div>
        )}
      </section>
    </main>
  );
}
