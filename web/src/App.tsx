// Giao diện điều khiển — chuyển nguyên từ app NQFT (Expo/React Native, thư mục NQFT/App.tsx) sang web.
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import {
  bluetooth,
  book,
  bookOutline,
  caretBack,
  caretDown,
  caretForward,
  caretUp,
  close,
  gameControllerOutline,
  hardwareChip,
  keypadOutline,
  speedometerOutline,
} from 'ionicons/icons';
import { Icon } from './components/Icon';
import { mapInput, type ControlMode, type Direction } from './control/mapInput';
import { useCar } from './hooks/useCar';
import { chromeIntentUrl, detectPlatform, isBraveBrowser } from './hooks/platform';
import { FUNCTION_COUNT, MOTOR_SPEED_MAX } from './protocol/constants';
import { isWebBluetoothSupported } from './transport/BleTransport';

const BLUEFY_URL = 'https://apps.apple.com/app/bluefy-web-ble-browser/id1492822055';

function useWindowDimensions() {
  const read = () => ({ width: window.innerWidth, height: window.innerHeight });
  const [dims, setDims] = useState(read);
  useEffect(() => {
    const onResize = () => setDims(read());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return dims;
}

// ---------- Nút điều hướng (MODE 1) ----------
type ControlButtonProps = {
  icon: string;
  direction: Direction;
  onPressIn: (d: Direction) => void;
  onPressOut: (d: Direction) => void;
  size: number;
};

function ControlButton({ icon, direction, onPressIn, onPressOut, size }: ControlButtonProps) {
  const [isPressed, setIsPressed] = useState(false);

  const down = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsPressed(true);
    onPressIn(direction);
  };
  const up = () => {
    setIsPressed(false);
    onPressOut(direction);
  };

  return (
    <div
      className={`control-button${isPressed ? ' pressed' : ''}`}
      style={{ width: size, height: size }}
      onPointerDown={down}
      onPointerUp={up}
      onPointerCancel={up}
      onLostPointerCapture={() => isPressed && up()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="control-button-inner">
        <Icon src={icon} size={Math.floor(size * 0.42)} color={isPressed ? '#08252B' : '#BCF8F9'} />
      </div>
    </div>
  );
}

// ---------- Joystick (MODE 2) ----------
function VirtualJoystick({ size = 190, onMove }: { size?: number; onMove: (x: number, y: number) => void }) {
  const knobSize = size * 0.36;
  const maxRadius = (size - knobSize) / 2;
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ id: number; x: number; y: number } | null>(null);

  const down = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    setDragging(true);
  };

  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    let dx = e.clientX - s.x;
    let dy = e.clientY - s.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > maxRadius) {
      const angle = Math.atan2(dy, dx);
      dx = Math.cos(angle) * maxRadius;
      dy = Math.sin(angle) * maxRadius;
    }
    setPos({ x: dx, y: dy });
    onMove(Math.round((dx / maxRadius) * 100), Math.round((-dy / maxRadius) * 100));
  };

  const release = () => {
    if (!start.current) return;
    start.current = null;
    setDragging(false);
    setPos({ x: 0, y: 0 });
    onMove(0, 0);
  };

  return (
    <div className="joystick-wrapper">
      <div className="joystick-base" style={{ width: size, height: size, borderRadius: size / 2 }}>
        <div className="crosshair-horizontal" />
        <div className="crosshair-vertical" />
        <div className="joystick-inner-ring" />
        <div
          className={`joystick-knob${dragging ? ' dragging' : ''}`}
          style={{
            width: knobSize,
            height: knobSize,
            borderRadius: knobSize / 2,
            transform: `translate(${pos.x}px, ${pos.y}px)`,
          }}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={release}
          onPointerCancel={release}
          onLostPointerCapture={release}
        >
          <div className="joystick-knob-core" />
        </div>
      </div>
    </div>
  );
}

// ---------- 4 nút Function (chỉ chọn 1) ----------
function FunctionButtons({
  selectedFunc,
  onSelectFunc,
  layout,
}: {
  selectedFunc: number;
  onSelectFunc: (f: number) => void;
  layout: 'grid' | 'row';
}) {
  const buttons = Array.from({ length: FUNCTION_COUNT }, (_, i) => i + 1);
  return (
    <div className={layout === 'grid' ? 'func-grid' : 'func-row'}>
      {buttons.map((f) => {
        const isActive = selectedFunc === f;
        return (
          <button
            key={f}
            type="button"
            onClick={() => onSelectFunc(f)}
            className={`func-button ${layout === 'grid' ? 'func-button-grid' : 'func-button-row'}${isActive ? ' active' : ''}`}
          >
            <span className={`func-led${isActive ? ' on' : ''}`} />
            <span className="func-button-text">F{f}</span>
          </button>
        );
      })}
    </div>
  );
}

// ---------- Thanh tốc độ motor ----------
function MotorSlider({ motorName, speed, onSpeedChange }: { motorName: string; speed: number; onSpeedChange: (v: number) => void }) {
  return (
    <div className="motor-card">
      <div className="motor-header">
        <div className="motor-title-row">
          <Icon src={speedometerOutline} size={14} color="#7AE4E6" />
          <span className="motor-name">{motorName}</span>
        </div>
        <span className="speed-value">{speed}</span>
      </div>
      <input
        className="slider"
        type="range"
        min={0}
        max={MOTOR_SPEED_MAX}
        step={1}
        value={speed}
        aria-label={motorName}
        style={{ '--fill': `${(speed / MOTOR_SPEED_MAX) * 100}%` } as CSSProperties}
        onChange={(e) => onSpeedChange(Math.round(Number(e.target.value)))}
      />
    </div>
  );
}

// ---------- Hướng dẫn (overlay) ----------
function GuideOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="overlay-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <Icon src={book} size={18} color="#BCF8F9" />
          <span className="modal-title">HƯỚNG DẪN SỬ DỤNG - WATT'UP</span>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Đóng">
            <Icon src={close} size={22} color="#88C9CE" />
          </button>
        </div>

        <div className="modal-body">
          <div className="guide-section">
            <div className="guide-heading">1. Chọn phần cứng (Hardware)</div>
            <div className="guide-text">
              • Vi điều khiển: ESP32 có BLE (ESP32 WROOM-32, C3, S3, C6). Không dùng HC-05 / HC-06 (Bluetooth thường, trình duyệt không kết nối được).<br />
              • Mạch điều khiển động cơ: L298N hoặc mạch cầu H tương thích PWM.<br />
              • Nguồn điện ổn định cho xe điều khiển cấp THPT (5V - 12V).
            </div>
          </div>

          <div className="guide-section">
            <div className="guide-heading">2. Kết nối không dây (Connection)</div>
            <div className="guide-text">
              • Bật Bluetooth trên điện thoại và nguồn của xe.<br />
              • Nhấn nút <b className="guide-strong">BLUETOOTH</b> trên app để quét và ghép nối với thiết bị phần cứng của đội.<br />
              • Đảm bảo khoảng cách ổn định trong phạm vi 5–6 mét theo yêu cầu cuộc thi.
            </div>
          </div>

          <div className="guide-section">
            <div className="guide-heading">3. Cấu hình UUID cho ESP32</div>
            <div className="guide-text">
              • Định nghĩa Service UUID và Characteristic UUID trong code Arduino/ESP32 trùng khớp với mã UUID cấu hình trên App BLE.<br />
              • Gói tin 4 byte (seq, ga, lái, cờ F1-F4) gửi 30 lần/giây, xem docs/protocol.md.
            </div>
          </div>
        </div>

        <button type="button" className="modal-close-button" onClick={onClose}>
          ĐÃ HIỂU
        </button>
      </div>
    </div>
  );
}

/** Trình duyệt không dùng được Bluetooth: hỏi mở bằng trình duyệt phù hợp. */
function explainUnsupported() {
  const platform = detectPlatform();
  if (platform === 'android') {
    const why = isBraveBrowser()
      ? 'Brave chặn Bluetooth cho trang web.'
      : 'Trình duyệt này không hỗ trợ Bluetooth (Zalo, Facebook, Firefox…).';
    if (window.confirm(`${why}\n\nMở app bằng Google Chrome?`)) window.location.href = chromeIntentUrl();
  } else if (platform === 'ios') {
    if (window.confirm('Safari trên iPhone/iPad không hỗ trợ Bluetooth cho web.\n\nTải trình duyệt Bluefy (miễn phí)?')) {
      window.open(BLUEFY_URL, '_blank', 'noreferrer');
    }
  } else {
    window.alert(
      isBraveBrowser()
        ? 'Brave chặn Bluetooth cho trang web. Hãy mở bằng Chrome hoặc Edge.'
        : 'Trình duyệt này không hỗ trợ Bluetooth. Hãy mở bằng Chrome hoặc Edge.',
    );
  }
}

// ---------- Ứng dụng chính ----------
export default function App() {
  const { width, height } = useWindowDimensions();
  const { status, connect, disconnect, controlLoop } = useCar();

  const buttonSize = Math.min(130, Math.max(82, Math.floor(Math.min(width, height) * 0.18)));

  const [mode, setMode] = useState<ControlMode>('MODE_1');
  const [guideVisible, setGuideVisible] = useState(false);
  const [pressedDirections, setPressedDirections] = useState<Direction[]>([]);
  const [motor1Speed, setMotor1Speed] = useState(128);
  const [motor2Speed, setMotor2Speed] = useState(128);
  const [selectedFunc, setSelectedFunc] = useState(0);
  // Joystick đổi liên tục -> giữ trong ref để không render lại cả app.
  const joystick = useRef({ x: 0, y: 0 });

  const btConnected = status.state === 'connected';
  const btBusy = status.state === 'connecting' || status.state === 'reconnecting';

  const latest = useRef({ mode, pressedDirections, motor1Speed, motor2Speed, selectedFunc });
  latest.current = { mode, pressedDirections, motor1Speed, motor2Speed, selectedFunc };

  const pushInput = () => {
    const s = latest.current;
    controlLoop.setInput(
      mapInput({
        mode: s.mode,
        pressed: s.pressedDirections,
        joystick: joystick.current,
        motor1Speed: s.motor1Speed,
        motor2Speed: s.motor2Speed,
        func: s.selectedFunc,
      }),
    );
  };

  // Mỗi khi trạng thái UI đổi (hoặc vừa kết nối lại) -> cập nhật lệnh gửi đi.
  useEffect(pushInput, [mode, pressedDirections, motor1Speed, motor2Speed, selectedFunc, status.state]);

  // Đổi chế độ / ẩn app -> thả hết nút, joystick về giữa.
  useEffect(() => {
    joystick.current = { x: 0, y: 0 };
    setPressedDirections([]);
  }, [mode]);
  useEffect(() => {
    const onHide = () => {
      if (document.hidden) {
        joystick.current = { x: 0, y: 0 };
        setPressedDirections([]);
      }
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, []);

  // Lỗi kết nối -> hộp thoại của trình duyệt (UI NQFT không có vùng báo lỗi).
  useEffect(() => {
    if (status.error) window.alert(status.error);
  }, [status.error]);

  const handleBluetooth = () => {
    if (status.state !== 'disconnected') {
      disconnect();
      return;
    }
    if (!isWebBluetoothSupported() || isBraveBrowser()) {
      explainUnsupported();
      return;
    }
    void connect();
  };

  const handleSelectFunc = (f: number) => setSelectedFunc((prev) => (prev === f ? 0 : f));
  const handlePressIn = (d: Direction) => setPressedDirections((prev) => (prev.includes(d) ? prev : [...prev, d]));
  const handlePressOut = (d: Direction) => setPressedDirections((prev) => prev.filter((item) => item !== d));

  const motors = (
    <div className="motor-controls">
      <MotorSlider motorName="MOTOR 1" speed={motor1Speed} onSpeedChange={setMotor1Speed} />
      <MotorSlider motorName="MOTOR 2" speed={motor2Speed} onSpeedChange={setMotor2Speed} />
    </div>
  );

  return (
    <div className="screen">
      <div className="scroll-content">
        <div className="control-panel">
          {/* TOP BAR: trái tên nhóm - phải các nút */}
          <div className="top-bar">
            <div className="brand">
              <Icon src={hardwareChip} size={20} color="#BCF8F9" />
              <span className="brand-text">Watt'up Debuggers</span>
            </div>

            <div className="top-right-actions">
              <button
                type="button"
                onClick={() => setMode('MODE_1')}
                className={`top-action-button${mode === 'MODE_1' ? ' mode-active' : ''}`}
              >
                <Icon src={keypadOutline} size={14} color={mode === 'MODE_1' ? '#08252B' : '#88C9CE'} />
                <span className="top-action-text">MODE 1</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('MODE_2')}
                className={`top-action-button${mode === 'MODE_2' ? ' mode-active' : ''}`}
              >
                <Icon src={gameControllerOutline} size={14} color={mode === 'MODE_2' ? '#08252B' : '#88C9CE'} />
                <span className="top-action-text">MODE 2</span>
              </button>

              <button
                type="button"
                onClick={handleBluetooth}
                className={`top-action-button ${btConnected ? 'bt-connected' : 'bt-disconnected'}${btBusy ? ' bt-busy' : ''}`}
                title={btConnected || btBusy ? 'Bấm để ngắt kết nối' : 'Bấm để kết nối xe RC-Car-XXXX'}
              >
                <Icon src={bluetooth} size={14} color={btConnected ? '#08252B' : '#88C9CE'} />
                <span className="top-action-text">{btConnected ? 'CONNECTED' : 'BLUETOOTH'}</span>
              </button>

              <button type="button" onClick={() => setGuideVisible(true)} className="top-action-button guide-button">
                <Icon src={bookOutline} size={14} color="#BCF8F9" />
                <span className="top-action-text guide-text-color">HƯỚNG DẪN</span>
              </button>
            </div>
          </div>

          {mode === 'MODE_1' ? (
            /* ================= CHẾ ĐỘ 1 ================= */
            <div className="main-control">
              <div className="left-column-mode1">
                <ControlButton icon={caretUp} direction="UP" size={buttonSize} onPressIn={handlePressIn} onPressOut={handlePressOut} />
                <ControlButton icon={caretDown} direction="DOWN" size={buttonSize} onPressIn={handlePressIn} onPressOut={handlePressOut} />
              </div>

              <div className="center-column-mode1">
                <FunctionButtons selectedFunc={selectedFunc} onSelectFunc={handleSelectFunc} layout="grid" />
              </div>

              <div className="right-column-mode1">
                {motors}
                <div className="horizontal-controls">
                  <ControlButton icon={caretBack} direction="LEFT" size={buttonSize} onPressIn={handlePressIn} onPressOut={handlePressOut} />
                  <ControlButton icon={caretForward} direction="RIGHT" size={buttonSize} onPressIn={handlePressIn} onPressOut={handlePressOut} />
                </div>
              </div>
            </div>
          ) : (
            /* ================= CHẾ ĐỘ 2 ================= */
            <div className="main-control">
              <div className="left-column-mode2">
                <VirtualJoystick
                  size={Math.min(230, Math.floor(height * 0.6))}
                  onMove={(x, y) => {
                    joystick.current = { x, y };
                    pushInput();
                  }}
                />
              </div>

              <div className="right-column-mode2">
                {motors}
                <div className="func-under-motor">
                  <FunctionButtons selectedFunc={selectedFunc} onSelectFunc={handleSelectFunc} layout="row" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {guideVisible && <GuideOverlay onClose={() => setGuideVisible(false)} />}
    </div>
  );
}
