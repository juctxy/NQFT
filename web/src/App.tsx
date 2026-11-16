import { useEffect, useState } from 'react';
import { useCar } from './hooks/useCar';
import { isWebBluetoothSupported } from './transport/BleTransport';
import type { ConnectionState } from './transport/Transport';

// Trang kiểm tra kết nối tối giản — UI lái thật sẽ thiết kế ở giai đoạn sau.

const STATE_LABEL: Record<ConnectionState, string> = {
  disconnected: 'Chưa kết nối',
  connecting: 'Đang kết nối…',
  connected: 'Đã kết nối',
  reconnecting: 'Đang kết nối lại…',
};

function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function UnsupportedNotice() {
  return (
    <div className="notice">
      <strong>Trình duyệt này không hỗ trợ Web Bluetooth.</strong>
      {isIos() ? (
        <p>Trên iPhone/iPad: cài trình duyệt <b>Bluefy</b> (miễn phí trên App Store) rồi mở lại trang này trong Bluefy.</p>
      ) : (
        <p>Hãy mở bằng <b>Chrome</b> hoặc <b>Edge</b> (Android, Windows, macOS, Linux). Firefox và Safari không hỗ trợ.</p>
      )}
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

      <section className="card">
        <div className={`state state-${status.state}`}>{STATE_LABEL[status.state]}</div>
        {status.deviceName && <div>Thiết bị: {status.deviceName}</div>}
        {status.error && <div className="error">{status.error}</div>}
        <div className="row">
          <button onClick={connect} disabled={!supported || status.state !== 'disconnected'}>
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
