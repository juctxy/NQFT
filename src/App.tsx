import { useState, useRef, useEffect } from 'react';
import {
  Bluetooth,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Triangle,
  Circle,
  Square,
  X,
  BookOpen,
  Settings,
  ArrowLeftCircle,
  RotateCcw,
} from 'lucide-react';
import './App.css';

type CommandType =
  | 'STOP'
  | 'FORWARD'
  | 'BACKWARD'
  | 'LEFT'
  | 'RIGHT'
  | 'FORWARD_LEFT'
  | 'FORWARD_RIGHT'
  | 'BACKWARD_LEFT'
  | 'BACKWARD_RIGHT';

type PageView = 'CONTROLLER' | 'INSTRUCTION' | 'SETTINGS';

interface SpeedPresets {
  slow: number;
  medium: number;
  fast: number;
}

const DEFAULT_PRESETS: SpeedPresets = {
  slow: 130,
  medium: 190,
  fast: 255,
};

export default function App() {
  const [activePage, setActivePage] = useState<PageView>('CONTROLLER');
  const [btConnected, setBtConnected] = useState(false);
  const [motor1Speed, setMotor1Speed] = useState<number>(190);
  const [motor2Speed, setMotor2Speed] = useState<number>(190);
  const [speedPresets, setSpeedPresets] = useState<SpeedPresets>(DEFAULT_PRESETS);

  const [currentCmd, setCurrentCmd] = useState<CommandType>('STOP');
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [joyPos, setJoyPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [scale, setScale] = useState(1);

  const joystickRef = useRef<HTMLDivElement | null>(null);
  const maxRadius = 60;

  useEffect(() => {
    const handleResize = () => {
      const baseWidth = 840;
      const baseHeight = 430;
      const scaleX = window.innerWidth / baseWidth;
      const scaleY = window.innerHeight / baseHeight;
      setScale(Math.min(scaleX, scaleY) * 0.96);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const determineDirection = (dx: number, dy: number): CommandType => {
    if (Math.hypot(dx, dy) < 15) return 'STOP';
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    if (angle >= -22.5 && angle < 22.5) return 'RIGHT';
    if (angle >= 22.5 && angle < 67.5) return 'BACKWARD_RIGHT';
    if (angle >= 67.5 && angle < 112.5) return 'BACKWARD';
    if (angle >= 112.5 && angle < 157.5) return 'BACKWARD_LEFT';
    if (angle >= 157.5 || angle < -157.5) return 'LEFT';
    if (angle >= -157.5 && angle < -112.5) return 'FORWARD_LEFT';
    if (angle >= -112.5 && angle < -67.5) return 'FORWARD';
    return 'FORWARD_RIGHT';
  };

  const updateJoystick = (clientX: number, clientY: number) => {
    if (!joystickRef.current) return;
    const rect = joystickRef.current.getBoundingClientRect();
    let dx = (clientX - (rect.left + rect.width / 2)) / scale;
    let dy = (clientY - (rect.top + rect.height / 2)) / scale;
    const distance = Math.hypot(dx, dy);

    if (distance > maxRadius) {
      dx *= maxRadius / distance;
      dy *= maxRadius / distance;
    }
    setJoyPos({ x: dx, y: dy });
    setCurrentCmd(determineDirection(dx, dy));
  };

  const triggerAction = (label: string) => {
    setActiveAction(label);
    setTimeout(() => setActiveAction(null), 300);
  };

  const updatePresetValue = (key: keyof SpeedPresets, rawVal: number) => {
    const clamped = Math.max(0, Math.min(255, Number.isNaN(rawVal) ? 0 : rawVal));
    setSpeedPresets((prev) => ({ ...prev, [key]: clamped }));
  };

  const applyPresetToMotors = (val: number) => {
    setMotor1Speed(val);
    setMotor2Speed(val);
    setActivePage('CONTROLLER');
  };

  // 1. TRANG INSTRUCTION (HƯỚNG DẪN SỬ DỤNG)
  if (activePage === 'INSTRUCTION') {
    return (
      <div className="subpage-container">
        <div className="subpage-card">
          <div className="subpage-header">
            <div className="subpage-title">
              <BookOpen size={20} color="#f47518" />
              INSTRUCTION — HƯỚNG DẪN SỬ DỤNG
            </div>
            <button onClick={() => setActivePage('CONTROLLER')} className="back-btn">
              <ArrowLeftCircle size={16} />
              BACK
            </button>
          </div>

          <div className="subpage-body">
            <div className="guide-grid">
              <div className="guide-card">
                <div className="guide-card-header">
                  <span className="guide-badge">1</span>
                  Joystick Điều Hướng (Trái)
                </div>
                <p>
                  Kéo cần gạt theo 8 hướng để điều khiển robot tiến, lùi, rẽ trái/phải hoặc di chuyển chéo. Thả tay ra robot tự động dừng (STOP).
                </p>
              </div>

              <div className="guide-card">
                <div className="guide-card-header">
                  <span className="guide-badge">2</span>
                  Thanh Chỉnh Xung M1 & M2
                </div>
                <p>
                  Kéo thanh trượt phía trên để tinh chỉnh độc lập mức công suất PWM (0 – 255) cho Motor trái (M1) và Motor phải (M2).
                </p>
              </div>

              <div className="guide-card">
                <div className="guide-card-header">
                  <span className="guide-badge">3</span>
                  Cụm Nút Hành Động (Phải)
                </div>
                <p>
                  Gồm nút <strong>CẢN</strong> (phòng thủ), <strong>SÚT</strong> (kích hoạt cơ cấu sút bóng) cùng 2 nút mở rộng <strong>FUNC 3</strong> và <strong>FUNC 4</strong>.
                </p>
              </div>

              <div className="guide-card">
                <div className="guide-card-header">
                  <span className="guide-badge">4</span>
                  Kết Nối & Cài Đặt Nhanh
                </div>
                <p>
                  Bấm <strong>BLUETOOTH</strong> để ghép nối thiết bị. Dùng <strong>FUNC 1/2</strong> cho lệnh phụ và icon bánh răng để chỉnh sẵn mức xung tốc độ.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. TRANG SETTING CHỈNH XUNG CHO TỪNG STATE TỐC ĐỘ
  if (activePage === 'SETTINGS') {
    return (
      <div className="subpage-container">
        <div className="subpage-card">
          <div className="subpage-header">
            <div className="subpage-title">
              <Settings size={20} color="#f47518" />
              CÀI ĐẶT XUNG TỐC ĐỘ (PWM 0 – 255)
            </div>
            <button onClick={() => setActivePage('CONTROLLER')} className="back-btn">
              <ArrowLeftCircle size={16} />
              LƯU & QUAY LẠI
            </button>
          </div>

          <div className="subpage-body">
            <div className="setting-rows">
              <div className="setting-row">
                <span className="setting-label">State 1: CHẬM</span>
                <div className="setting-controls">
                  <input
                    type="range"
                    min={0}
                    max={255}
                    value={speedPresets.slow}
                    onChange={(e) => updatePresetValue('slow', Number(e.target.value))}
                  />
                  <input
                    type="number"
                    min={0}
                    max={255}
                    value={speedPresets.slow}
                    onChange={(e) => updatePresetValue('slow', Number(e.target.value))}
                    className="setting-number"
                  />
                </div>
                <button
                  onClick={() => applyPresetToMotors(speedPresets.slow)}
                  className="apply-btn"
                >
                  Áp dụng M1/M2
                </button>
              </div>

              <div className="setting-row">
                <span className="setting-label">State 2: VỪA</span>
                <div className="setting-controls">
                  <input
                    type="range"
                    min={0}
                    max={255}
                    value={speedPresets.medium}
                    onChange={(e) => updatePresetValue('medium', Number(e.target.value))}
                  />
                  <input
                    type="number"
                    min={0}
                    max={255}
                    value={speedPresets.medium}
                    onChange={(e) => updatePresetValue('medium', Number(e.target.value))}
                    className="setting-number"
                  />
                </div>
                <button
                  onClick={() => applyPresetToMotors(speedPresets.medium)}
                  className="apply-btn"
                >
                  Áp dụng M1/M2
                </button>
              </div>

              <div className="setting-row">
                <span className="setting-label">State 3: NHANH</span>
                <div className="setting-controls">
                  <input
                    type="range"
                    min={0}
                    max={255}
                    value={speedPresets.fast}
                    onChange={(e) => updatePresetValue('fast', Number(e.target.value))}
                  />
                  <input
                    type="number"
                    min={0}
                    max={255}
                    value={speedPresets.fast}
                    onChange={(e) => updatePresetValue('fast', Number(e.target.value))}
                    className="setting-number"
                  />
                </div>
                <button
                  onClick={() => applyPresetToMotors(speedPresets.fast)}
                  className="apply-btn"
                >
                  Áp dụng M1/M2
                </button>
              </div>
            </div>

            <div className="setting-footer">
              <button
                onClick={() => setSpeedPresets(DEFAULT_PRESETS)}
                className="reset-btn"
              >
                <RotateCcw size={14} />
                Mặc định (130 / 190 / 255)
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. MÀN HÌNH CHÍNH: TAY CẦM ĐIỀU KHIỂN
  return (
    <div className="app-container">
      <div
        className="controller-scaler"
        style={{ transform: `scale(${scale})` }}
      >
        {/* Thanh thông số trên cùng */}
        <div className="top-bar">
          <div className="status-group">
            <div className="cmd-badge">
              CMD: <span className="cmd-value">{activeAction || currentCmd}</span>
            </div>

            <div className="sliders-group">
              <div className="slider-item">
                <label htmlFor="m1">M1:</label>
                <input
                  id="m1"
                  type="range"
                  min={0}
                  max={255}
                  value={motor1Speed}
                  onChange={(e) => setMotor1Speed(Number(e.target.value))}
                />
                <span className="slider-val">{motor1Speed}</span>
              </div>

              <div className="slider-item">
                <label htmlFor="m2">M2:</label>
                <input
                  id="m2"
                  type="range"
                  min={0}
                  max={255}
                  value={motor2Speed}
                  onChange={(e) => setMotor2Speed(Number(e.target.value))}
                />
                <span className="slider-val">{motor2Speed}</span>
              </div>
            </div>
          </div>

          {/* Cụm nút bên phải xếp 2 hàng: Hàng 1 Bluetooth, Hàng 2 Instruction + Setting */}
          <div className="right-top-stack">
            <button
              onClick={() => setBtConnected(!btConnected)}
              className={`bt-btn ${btConnected ? 'connected' : ''}`}
            >
              <Bluetooth size={16} color="#f47518" />
              {btConnected ? 'CONNECTED' : 'BLUETOOTH'}
            </button>

            <div className="sub-nav-row">
              <button
                onClick={() => setActivePage('INSTRUCTION')}
                title="Instruction"
                className="top-nav-btn flex-grow"
              >
                <BookOpen size={13} color="#f47518" />
                INSTRUCTION
              </button>

              <button
                onClick={() => setActivePage('SETTINGS')}
                title="Settings"
                className="top-nav-btn"
              >
                <Settings size={14} color="#06324d" />
              </button>
            </div>
          </div>
        </div>

        {/* Thân tay cầm Gamepad */}
        <div className="gamepad-body">
          <div className="gamepad-bridge" />

          {/* Trái: Joystick điều khiển 4 bánh */}
          <div className="grip-circle">
            <div
              ref={joystickRef}
              className="joystick-base"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                setIsDragging(true);
                updateJoystick(e.clientX, e.clientY);
              }}
              onPointerMove={(e) => isDragging && updateJoystick(e.clientX, e.clientY)}
              onPointerUp={() => {
                setIsDragging(false);
                setJoyPos({ x: 0, y: 0 });
                setCurrentCmd('STOP');
              }}
            >
              <ArrowUp size={14} color="rgba(244,117,24,0.6)" style={{ position: 'absolute', top: 8 }} />
              <ArrowDown size={14} color="rgba(244,117,24,0.6)" style={{ position: 'absolute', bottom: 8 }} />
              <ArrowLeft size={14} color="rgba(244,117,24,0.6)" style={{ position: 'absolute', left: 8 }} />
              <ArrowRight size={14} color="rgba(244,117,24,0.6)" style={{ position: 'absolute', right: 8 }} />

              <div
                className="joystick-knob"
                style={{
                  transform: `translate(${joyPos.x}px, ${joyPos.y}px)`,
                  transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                }}
              >
                <div className="joystick-knob-inner" />
              </div>
            </div>
          </div>

          {/* Giữa: FUNC 1 & FUNC 2 */}
          <div className="center-buttons">
            <button
              onClick={() => triggerAction('FUNC 1')}
              className="func-btn"
            >
              FUNC 1
            </button>
            <button
              onClick={() => triggerAction('FUNC 2')}
              className="func-btn"
            >
              FUNC 2
            </button>
          </div>

          {/* Phải: Sút banh, Cản banh & FUNC 3, FUNC 4 */}
          <div className="grip-circle">
            <div className="action-pad">
              <button
                onClick={() => triggerAction('BLOCK (CẢN BANH)')}
                title="Cản banh"
                className="action-btn btn-top"
              >
                <Triangle size={22} strokeWidth={2.5} />
                <span style={{ fontSize: 10, fontWeight: 'bold', marginTop: 2 }}>CẢN</span>
              </button>

              <button
                onClick={() => triggerAction('KICK (SÚT BANH)')}
                title="Sút banh"
                className="action-btn btn-bottom"
              >
                <X size={24} strokeWidth={2.5} />
                <span style={{ fontSize: 10, fontWeight: 'bold' }}>SÚT</span>
              </button>

              <button
                onClick={() => triggerAction('FUNC 3')}
                title="Chức năng 3"
                className="action-btn btn-left"
              >
                <Square size={22} strokeWidth={2.2} />
                <span style={{ fontSize: 9, marginTop: 2, fontWeight: 'bold' }}>FUNC 3</span>
              </button>

              <button
                onClick={() => triggerAction('FUNC 4')}
                title="Chức năng 4"
                className="action-btn btn-right"
              >
                <Circle size={22} strokeWidth={2.2} />
                <span style={{ fontSize: 9, marginTop: 2, fontWeight: 'bold' }}>FUNC 4</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}