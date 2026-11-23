// Màn hình tay cầm — chuyển từ ControllerScreen của NQFT (juctxy.github.io/NQFT).
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Bluetooth, BookOpen, Circle, Settings, Square, Triangle, X } from 'lucide-react';
import { clampJoystick, mixDrive, normalizeJoystick, type Vec } from '../drive/driveModel';
import { useController } from '../drive/ControllerContext';
import { nearbyDeviceName, useBluetooth } from '../hooks/BluetoothContext';
import { useDriveInput } from '../hooks/useDriveInput';
import { ButtonBit } from '../protocol/constants';
import { Pressable, Text, View, shadow, sx, type Style } from '../ui/rn';
import { BluetoothPicker } from './BluetoothPicker';
import { SpeedPresetSelector } from './SpeedPresetSelector';
import logo from '../assets/logo.jpg';

const CANVAS_W = 840;
const CANVAS_H = 380;
const KNOB_RANGE = 60;
const JOY_CENTER = 95;

function useViewport() {
  const read = () => ({ width: window.innerWidth, height: window.innerHeight });
  const [v, setV] = useState(read);
  useEffect(() => {
    const on = () => setV(read());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return v;
}

/** Joystick analog 360°: chạm vào đâu, núm nhảy tới đó; thả tay về giữa. */
function Joystick({ wheelType, onChange }: { wheelType: string; onChange: (v: Vec) => void }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const active = useRef<{ id: number; scale: number; left: number; top: number } | null>(null);

  const move = (clientX: number, clientY: number) => {
    const a = active.current;
    if (!a) return;
    const o = clampJoystick((clientX - a.left) / a.scale - JOY_CENTER, (clientY - a.top) / a.scale - JOY_CENTER, KNOB_RANGE);
    setPos(o);
    onChange(normalizeJoystick(o.x / KNOB_RANGE, -o.y / KNOB_RANGE));
  };
  const down = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (active.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.setPointerCapture(e.pointerId);
    active.current = { id: e.pointerId, scale: r.width / 190, left: r.left, top: r.top };
    move(e.clientX, e.clientY);
  };
  const end = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (active.current?.id !== e.pointerId) return;
    active.current = null;
    setPos({ x: 0, y: 0 });
    onChange({ x: 0, y: 0 });
  };

  return (
    <View
      role="slider"
      aria-label="Cần điều khiển analog 360 độ"
      title={wheelType === 'standard' ? 'Lên xuống để tiến lùi, trái phải để quay tại chỗ' : 'Điều khiển xe di chuyển liên tục theo mọi hướng'}
      style={s.joystick}
      className="rn-touch"
      onPointerDown={down}
      onPointerMove={(e) => active.current?.id === e.pointerId && move(e.clientX, e.clientY)}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
    >
      <ArrowUp color="rgba(244,117,24,0.6)" size={14} style={s.arrowUp} />
      <ArrowDown color="rgba(244,117,24,0.6)" size={14} style={s.arrowDown} />
      <ArrowLeft color="rgba(244,117,24,0.6)" size={14} style={s.arrowLeft} />
      <ArrowRight color="rgba(244,117,24,0.6)" size={14} style={s.arrowRight} />
      <View style={[s.joystickKnob, { transform: `translate(${pos.x}px, ${pos.y}px)`, pointerEvents: 'none' }]}>
        <View style={s.joystickKnobInner} />
      </View>
    </View>
  );
}

/** Nút giữ-để-kích-hoạt; nhiều nút có thể giữ cùng lúc với joystick. */
function HoldButton({
  label,
  style,
  pressedStyle,
  children,
  onDown,
  onUp,
}: {
  label: string;
  style: Style;
  pressedStyle: Style;
  children: ReactNode;
  onDown: () => void;
  onUp: () => void;
}) {
  const [pressed, setPressed] = useState(false);
  const end = () => {
    if (!pressed) return;
    setPressed(false);
    onUp();
  };
  return (
    <button
      type="button"
      aria-label={label}
      className="rn-v rn-p rn-touch"
      style={sx(style, pressed && pressedStyle)}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setPressed(true);
        onDown();
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !pressed) {
          setPressed(true);
          onDown();
        }
      }}
      onKeyUp={end}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );
}

export function ControllerScreen({ onOpenInstructions, onOpenSettings }: { onOpenInstructions: () => void; onOpenSettings: () => void }) {
  const { driveSettings, activeDriveProfile: profile, driveSettingsReady, selectSpeedLevel } = useController();
  const bt = useBluetooth();
  const drive = useDriveInput(bt.controlLoop, profile, driveSettings.activeLevel, bt.connectionKey, bt.carSpeed);
  const noPwmPin = Boolean(bt.connectedDevice) && bt.carSpeed.noPwmPin;
  const [joystick, setJoystick] = useState<Vec>({ x: 0, y: 0 });
  const [rotate, setRotate] = useState(0);
  const [pickerVisible, setPickerVisible] = useState(false);
  const viewport = useViewport();
  const scale = 0.96 * Math.min(viewport.width / CANVAS_W, viewport.height / CANVAS_H);
  const wheelPwm = mixDrive(profile, driveSettings.activeLevel, joystick, rotate, noPwmPin);

  const onJoystickChange = (value: Vec) => {
    setJoystick(value);
    drive.setJoystick(value);
  };
  const onRotateChange = (value: number) => {
    setRotate(value);
    drive.setRotate(value);
  };

  useEffect(() => {
    const resetReadout = () => {
      if (document.hidden) {
        setJoystick({ x: 0, y: 0 });
        setRotate(0);
      }
    };
    document.addEventListener('visibilitychange', resetReadout);
    return () => document.removeEventListener('visibilitychange', resetReadout);
  }, []);

  const openPicker = useCallback(() => {
    setPickerVisible(true);
    if (!bt.connectedDevice && !bt.isConnecting) bt.scan();
  }, [bt]);
  const closePicker = useCallback(() => {
    setPickerVisible(false);
    bt.stopScan();
  }, [bt]);

  const action = (code: number) => ({ onDown: () => drive.pressButton(code), onUp: () => drive.releaseButton(code) });

  return (
    <View style={s.root}>
      <View style={[s.canvas, { transform: `scale(${scale})` }]}>
        <View style={s.topBar}>
          <View style={s.brand}>
            <img src={logo} alt="" style={s.logo} />
            <Text style={s.brandName}>
              <Text style={s.brandAccent}>Watt'up</Text> Debuggers
            </Text>
          </View>

          <View style={s.levelGroup}>
            <Text style={s.wheelTypeLabel}>
              Bánh: {profile.wheelType === 'standard' ? 'Standard' : profile.wheelType === 'omni' ? 'Omni' : 'Mecanum'}
            </Text>
            <SpeedPresetSelector
              level={driveSettings.activeLevel}
              wheelPwm={wheelPwm}
              noPwmPin={noPwmPin}
              ready={driveSettingsReady}
              onSelectLevel={selectSpeedLevel}
            />
          </View>

          <View style={s.rightTopStack}>
            <Pressable
              label={bt.connectedDevice ? `Manage Bluetooth connection to ${nearbyDeviceName(bt.connectedDevice)}` : 'Connect to a Bluetooth device'}
              onPress={openPicker}
              style={[s.bluetoothButton, bt.connectedDevice && s.connectedButton]}
            >
              <Bluetooth color="#f47518" size={16} />
              <Text numberOfLines={1} style={s.bluetoothText}>
                {bt.isConnecting ? 'CONNECTING' : bt.connectedDevice ? nearbyDeviceName(bt.connectedDevice).toUpperCase() : 'BLUETOOTH'}
              </Text>
            </Pressable>
            <View style={s.subNavRow}>
              <Pressable onPress={onOpenInstructions} style={[s.topNavButton, s.instructionButton]}>
                <BookOpen color="#f47518" size={13} />
                <Text style={s.topNavText}>INSTRUCTION</Text>
              </Pressable>
              <Pressable
                label="Settings"
                onPress={() => {
                  drive.stop();
                  onOpenSettings();
                }}
                style={[s.topNavButton, s.settingsButton]}
              >
                <Settings color="#06324d" size={14} />
              </Pressable>
            </View>
          </View>
        </View>

        <View style={s.gamepadBody}>
          <View style={[s.gamepadBridge, { pointerEvents: 'none' }]} />
          <View style={s.gripCircle}>
            <Joystick wheelType={profile.wheelType} onChange={onJoystickChange} />
          </View>

          <View style={s.centerButtons}>
            <HoldButton label="FUNC 1" style={s.functionButton} pressedStyle={s.pressedButton} {...action(ButtonBit.Func1)}>
              <Text style={s.functionText}>FUNC 1</Text>
            </HoldButton>
            <HoldButton label="FUNC 2" style={s.functionButton} pressedStyle={s.pressedButton} {...action(ButtonBit.Func2)}>
              <Text style={s.functionText}>FUNC 2</Text>
            </HoldButton>
            {profile.wheelType !== 'standard' ? (
              <View style={s.rotateControls}>
                <HoldButton label="QUẸO TRÁI" style={s.rotateButton} pressedStyle={s.pressedButton} onDown={() => onRotateChange(-1)} onUp={() => onRotateChange(0)}>
                  <Text style={s.rotateButtonText}>QUẸO TRÁI</Text>
                </HoldButton>
                <HoldButton label="QUẸO PHẢI" style={s.rotateButton} pressedStyle={s.pressedButton} onDown={() => onRotateChange(1)} onUp={() => onRotateChange(0)}>
                  <Text style={s.rotateButtonText}>QUẸO PHẢI</Text>
                </HoldButton>
              </View>
            ) : null}
          </View>

          <View style={s.gripCircle}>
            <View style={s.actionPad}>
              <HoldButton label="Cản banh" style={sx(s.actionButton, s.actionTop)} pressedStyle={s.pressedButton} {...action(ButtonBit.Triangle)}>
                <Triangle color="#fff" size={22} strokeWidth={2.5} />
              </HoldButton>
              <HoldButton label="Sút banh" style={sx(s.actionButton, s.actionBottom)} pressedStyle={s.pressedButton} {...action(ButtonBit.Cross)}>
                <X color="#fff" size={24} strokeWidth={2.5} />
              </HoldButton>
              <HoldButton label="Chức năng 3" style={sx(s.actionButton, s.actionLeft)} pressedStyle={s.pressedButton} {...action(ButtonBit.Square)}>
                <Square color="#fff" size={22} strokeWidth={2.2} />
              </HoldButton>
              <HoldButton label="Chức năng 4" style={sx(s.actionButton, s.actionRight)} pressedStyle={s.pressedButton} {...action(ButtonBit.Circle)}>
                <Circle color="#fff" size={22} strokeWidth={2.2} />
              </HoldButton>
            </View>
          </View>
        </View>
      </View>

      <BluetoothPicker
        visible={pickerVisible}
        devices={bt.devices}
        isScanning={bt.isScanning}
        isConnecting={bt.isConnecting}
        connectedDevice={bt.connectedDevice}
        error={bt.error}
        onClose={closePicker}
        onScan={bt.scan}
        onConnect={bt.connect}
        onDisconnect={bt.disconnect}
      />
    </View>
  );
}

const s: Record<string, Style> = {
  root: { alignItems: 'center', backgroundColor: '#f1f5f9', flex: '1 1 0%', justifyContent: 'center', overflow: 'hidden' },
  canvas: { alignItems: 'center', height: CANVAS_H, justifyContent: 'center', width: CANVAS_W },
  topBar: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    height: 82,
    justifyContent: 'space-between',
    marginBottom: 10,
    position: 'relative',
    width: 820,
    zIndex: 5,
  },
  brand: { alignItems: 'center', flexDirection: 'row', gap: 10, marginTop: 5, width: 200 },
  logo: { height: 44, width: 44, objectFit: 'contain', flexShrink: 0 },
  brandName: { color: '#06324d', flexShrink: 1, fontSize: 16, fontWeight: 900 },
  brandAccent: { color: '#0b8795' },
  levelGroup: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#cbd5e1',
    borderRadius: 12,
    borderWidth: 1,
    gap: 5,
    padding: '7px 10px',
    position: 'relative',
    zIndex: 10,
    transform: 'translateX(-16px)',
  },
  wheelTypeLabel: { color: '#334155', fontSize: 11, fontWeight: 700 },
  rightTopStack: { alignItems: 'stretch', gap: 6 },
  bluetoothButton: {
    alignItems: 'center',
    backgroundColor: '#06324d',
    borderBottomLeftRadius: 12,
    borderTopRightRadius: 12,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    padding: '10px 18px',
    width: 150,
  },
  connectedButton: { backgroundColor: '#16a34a' },
  bluetoothText: { color: '#fff', flexShrink: 1, fontSize: 12, fontWeight: 700 },
  subNavRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  topNavButton: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#06324d',
    borderRadius: 8,
    borderWidth: 1.5,
    flexDirection: 'row',
    height: 28,
    justifyContent: 'center',
    ...shadow('#000000', 0.06, 4, 2),
  },
  instructionButton: { flex: '1 1 0%', gap: 4, paddingLeft: 10, paddingRight: 10 },
  settingsButton: { width: 36 },
  topNavText: { color: '#06324d', fontSize: 10, fontWeight: 700 },
  gamepadBody: { alignItems: 'center', flexDirection: 'row', height: 320, justifyContent: 'space-between', position: 'relative', width: 780 },
  gamepadBridge: {
    backgroundColor: '#06324d',
    height: 210,
    left: '50%',
    position: 'absolute',
    top: 20,
    transform: 'translateX(-170px)',
    width: 340,
    zIndex: 0,
  },
  gripCircle: {
    alignItems: 'center',
    backgroundColor: '#06324d',
    borderRadius: 155,
    height: 310,
    justifyContent: 'center',
    width: 310,
    zIndex: 1,
    ...shadow('#000000', 0.3, 12, 10),
  },
  joystick: {
    alignItems: 'center',
    backgroundColor: '#042337',
    borderColor: '#0b476b',
    borderRadius: 95,
    borderWidth: 4,
    height: 190,
    justifyContent: 'center',
    width: 190,
  },
  arrowUp: { position: 'absolute', top: 8 },
  arrowDown: { bottom: 8, position: 'absolute' },
  arrowLeft: { left: 8, position: 'absolute' },
  arrowRight: { position: 'absolute', right: 8 },
  joystickKnob: {
    alignItems: 'center',
    backgroundColor: '#f47518',
    borderColor: '#ffad66',
    borderRadius: 30,
    borderWidth: 4,
    height: 60,
    justifyContent: 'center',
    width: 60,
    ...shadow('#000000', 0.5, 8, 6),
  },
  joystickKnobInner: { borderColor: 'rgba(255,255,255,0.4)', borderRadius: 12, borderWidth: 2, height: 24, width: 24 },
  centerButtons: { alignItems: 'center', gap: 12, marginTop: -40, zIndex: 2 },
  rotateControls: { flexDirection: 'row', gap: 6 },
  rotateButton: { alignItems: 'center', backgroundColor: '#0b8795', borderRadius: 8, justifyContent: 'center', minHeight: 34, paddingLeft: 8, paddingRight: 8 },
  rotateButtonText: { color: '#fff', fontSize: 9, fontWeight: 800 },
  functionButton: {
    alignItems: 'center',
    backgroundColor: '#f47518',
    borderColor: '#fff',
    borderRadius: 20,
    borderWidth: 2,
    justifyContent: 'center',
    paddingTop: 10,
    paddingBottom: 10,
    width: 105,
    ...shadow('#000000', 0.2, 4, 4),
  },
  functionText: { color: '#fff', fontSize: 11, fontWeight: 700 },
  actionPad: { height: 220, position: 'relative', width: 220 },
  actionButton: {
    alignItems: 'center',
    backgroundColor: '#f47518',
    borderRadius: 35,
    height: 70,
    justifyContent: 'center',
    position: 'absolute',
    width: 70,
    ...shadow('#000000', 0.3, 6, 4),
  },
  actionTop: { left: 75, top: 0 },
  actionBottom: { bottom: 0, left: 75 },
  actionLeft: { left: 0, top: 75 },
  actionRight: { right: 0, top: 75 },
  pressedButton: { backgroundColor: '#10b981', borderColor: '#d1fae5', opacity: 0.95, transform: 'scale(0.94)' },
};
