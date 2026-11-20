import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  GestureDetector,
  usePanGesture,
  useTapGesture,
  type PanGestureConfig,
  type PanGesture,
} from 'react-native-gesture-handler';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bluetooth,
  BookOpen,
  Circle,
  Settings,
  Square,
  Triangle,
  X,
} from 'lucide-react-native';
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import { BluetoothPicker } from './BluetoothPicker';
import { nearbyDeviceName, type NearbyDevice } from '../bluetooth';
import { clampJoystick } from '../controller';
import type { DriveMode } from '../controller';
import {
  normalizeJoystick,
  type DriveProfile,
  type JoystickVector,
  type SpeedLevel,
} from '../drive';
import { SpeedPresetSelector } from './SpeedPresetSelector';

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 500;
const JOYSTICK_SIZE = 190;
const JOYSTICK_RADIUS = 60;

interface ControllerScreenProps {
  driveProfile: DriveProfile;
  driveProfiles: DriveProfile[];
  activeLevel: SpeedLevel;
  driveSettingsReady: boolean;
  bluetoothDevices: NearbyDevice[];
  connectedDevice: NearbyDevice | null;
  bluetoothIsScanning: boolean;
  bluetoothIsConnecting: boolean;
  bluetoothError: string | null;
  actionLabel: string;
  onSelectSpeedLevel: (level: SpeedLevel) => void;
  onSelectProfile: (id: string) => void;
  onControlChange: (joystick: JoystickVector) => void;
  onRotateChange: (rotate: -1 | 0 | 1) => void;
  onAction: (action: string) => void;
  onBluetoothScan: () => Promise<void>;
  onBluetoothStopScan: () => Promise<void>;
  onBluetoothConnect: (device: NearbyDevice) => Promise<void>;
  onBluetoothDisconnect: () => Promise<void>;
  onOpenInstructions: () => void;
  onOpenSettings: () => void;
}

function Joystick({
  wheelType,
  position,
  gesture,
  actionLabel,
}: {
  wheelType: DriveMode;
  position: Animated.ValueXY;
  gesture: PanGesture;
  actionLabel: string;
}) {
  return (
    <GestureDetector gesture={gesture}>
      <View
        accessible
        accessibilityLabel="Cần điều khiển analog 360 độ"
        accessibilityHint={`${wheelType === 'standard'
          ? 'Lên xuống để tiến lùi, trái phải để quay tại chỗ'
          : 'Điều khiển xe di chuyển liên tục theo mọi hướng'}. Chức năng gần nhất: ${actionLabel}`}
        accessibilityRole="adjustable"
        style={styles.joystick}
      >
        <ArrowUp color="rgba(244,117,24,0.6)" size={14} style={styles.arrowUp} />
        <ArrowDown color="rgba(244,117,24,0.6)" size={14} style={styles.arrowDown} />
        <ArrowLeft color="rgba(244,117,24,0.6)" size={14} style={styles.arrowLeft} />
        <ArrowRight color="rgba(244,117,24,0.6)" size={14} style={styles.arrowRight} />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.joystickKnob,
            { transform: position.getTranslateTransform() },
          ]}
        >
          <View style={styles.joystickKnobInner} />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

function FunctionButton({
  label,
  joystickGesture,
  onPress,
}: {
  label: string;
  joystickGesture: PanGesture;
  onPress: () => void;
}) {
  const [isPressed, setIsPressed] = useState(false);
  const onPressRef = useRef(onPress);
  onPressRef.current = onPress;
  const tapGesture = useTapGesture(
    useMemo(
      () => ({
        runOnJS: true,
        simultaneousWith: joystickGesture,
        onBegin: () => setIsPressed(true),
        onActivate: () => onPressRef.current(),
        onFinalize: () => setIsPressed(false),
      }),
      [joystickGesture],
    ),
  );

  return (
    <GestureDetector gesture={tapGesture}>
      <View
        accessible
        accessibilityLabel={label}
        accessibilityRole="button"
        onAccessibilityTap={onPress}
        style={[styles.functionButton, isPressed && styles.pressedButton]}
      >
        <Text style={styles.functionText}>{label}</Text>
      </View>
    </GestureDetector>
  );
}

function ActionButton({
  label,
  accessibilityLabel,
  icon,
  style,
  joystickGesture,
  onPress,
}: {
  label: string;
  accessibilityLabel: string;
  icon: ReactNode;
  style: object;
  joystickGesture: PanGesture;
  onPress: () => void;
}) {
  const [isPressed, setIsPressed] = useState(false);
  const onPressRef = useRef(onPress);
  onPressRef.current = onPress;
  const tapGesture = useTapGesture(
    useMemo(
      () => ({
        runOnJS: true,
        simultaneousWith: joystickGesture,
        onBegin: () => setIsPressed(true),
        onActivate: () => onPressRef.current(),
        onFinalize: () => setIsPressed(false),
      }),
      [joystickGesture],
    ),
  );

  return (
    <GestureDetector gesture={tapGesture}>
      <View
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onAccessibilityTap={onPress}
        style={[
          styles.actionButton,
          style,
          isPressed && styles.pressedButton,
        ]}
      >
        {icon}
        <Text style={styles.actionLabel}>{label}</Text>
      </View>
    </GestureDetector>
  );
}

function RotateHoldButton({
  label,
  direction,
  onRotateChange,
}: {
  label: string;
  direction: -1 | 1;
  onRotateChange: (rotate: -1 | 0 | 1) => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPressIn={() => onRotateChange(direction)}
      onPressOut={() => onRotateChange(0)}
      style={({ pressed }) => [
        styles.rotateButton,
        pressed && styles.pressedButton,
      ]}
    >
      <Text style={styles.rotateButtonText}>{label}</Text>
    </Pressable>
  );
}

export function ControllerScreen({
  driveProfile,
  driveProfiles,
  activeLevel,
  driveSettingsReady,
  bluetoothDevices,
  connectedDevice,
  bluetoothIsScanning,
  bluetoothIsConnecting,
  bluetoothError,
  actionLabel,
  onSelectSpeedLevel,
  onSelectProfile,
  onControlChange,
  onRotateChange,
  onAction,
  onBluetoothScan,
  onBluetoothStopScan,
  onBluetoothConnect,
  onBluetoothDisconnect,
  onOpenInstructions,
  onOpenSettings,
}: ControllerScreenProps) {
  const [joystickPosition] = useState(
    () => new Animated.ValueXY({ x: 0, y: 0 }),
  );
  const joystickOrigin = useRef({ x: 0, y: 0 });
  const updateJoystickPosition = useCallback(
    (x: number, y: number) => {
      const next = clampJoystick(
        x - JOYSTICK_SIZE / 2,
        y - JOYSTICK_SIZE / 2,
        JOYSTICK_RADIUS,
      );
      joystickPosition.setValue(next);
      onControlChange(
        normalizeJoystick(next.x / JOYSTICK_RADIUS, -next.y / JOYSTICK_RADIUS),
      );
    },
    [joystickPosition, onControlChange],
  );
  const resetJoystick = useCallback(() => {
    joystickPosition.setValue({ x: 0, y: 0 });
    onControlChange({ x: 0, y: 0 });
    onRotateChange(0);
  }, [joystickPosition, onControlChange, onRotateChange]);
  const joystickGestureConfig = useMemo<PanGestureConfig>(
    () => ({
      runOnJS: true,
      cancelsJSResponder: false,
      onBegin: ({ x, y }) => {
        joystickOrigin.current = { x, y };
        updateJoystickPosition(x, y);
      },
      onUpdate: ({ translationX, translationY }) => {
        updateJoystickPosition(
          joystickOrigin.current.x + translationX,
          joystickOrigin.current.y + translationY,
        );
      },
      onFinalize: resetJoystick,
    }),
    [resetJoystick, updateJoystickPosition],
  );
  const joystickGesture = usePanGesture(joystickGestureConfig);
  const windowSize = useWindowDimensions();
  const [availableSize, setAvailableSize] = useState({
    width: windowSize.width,
    height: windowSize.height,
  });
  const [bluetoothPickerVisible, setBluetoothPickerVisible] = useState(false);
  const scale = Math.min(
    availableSize.width / CANVAS_WIDTH,
    availableSize.height / CANVAS_HEIGHT,
  ) * 0.96;

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setAvailableSize({ width, height });
  }, []);
  const handleBluetoothPress = useCallback(() => {
    setBluetoothPickerVisible(true);
    if (!connectedDevice && !bluetoothIsConnecting) {
      void onBluetoothScan();
    }
  }, [bluetoothIsConnecting, connectedDevice, onBluetoothScan]);
  const handleBluetoothPickerClose = useCallback(() => {
    setBluetoothPickerVisible(false);
    void onBluetoothStopScan();
  }, [onBluetoothStopScan]);

  return (
    <View
      onLayout={handleLayout}
      style={styles.root}
    >
      <View style={[styles.canvas, { transform: [{ scale }] }]}>
        <View style={styles.topBar}>
          <View style={styles.brand}>
            <Image
              source={require('../assets/logo.jpg')}
              resizeMode="contain"
              style={styles.logo}
            />
            <Text style={styles.brandName}>
              <Text style={styles.brandAccent}>Watt'up</Text> Debuggers
            </Text>
          </View>

          <View style={styles.levelGroup}>
            <Text style={styles.wheelTypeLabel}>
              Bánh: {driveProfile.wheelType === 'standard'
                ? 'Standard'
                : driveProfile.wheelType === 'omni'
                  ? 'Omni'
                  : 'Mecanum'}
            </Text>
            <SpeedPresetSelector
              level={activeLevel}
              ready={driveSettingsReady}
              joystickGesture={joystickGesture}
              onSelectLevel={onSelectSpeedLevel}
            />
            {driveProfiles.slice(0, 2).length > 1 ? (
              <View style={styles.quickSwitchRow}>
                {driveProfiles.slice(0, 2).map((profile, index) => (
                  <Pressable
                    key={profile.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Chọn nhanh hồ sơ ${index === 0 ? 'A' : 'B'}: ${profile.name}`}
                    accessibilityState={{ selected: profile.id === driveProfile.id }}
                    onPress={() => onSelectProfile(profile.id)}
                    style={[
                      styles.quickSwitchButton,
                      profile.id === driveProfile.id && styles.quickSwitchButtonActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.quickSwitchText,
                        profile.id === driveProfile.id && styles.quickSwitchTextActive,
                      ]}
                    >
                      {index === 0 ? 'A' : 'B'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>

          <View style={styles.rightTopStack}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                connectedDevice
                  ? `Manage Bluetooth connection to ${nearbyDeviceName(connectedDevice)}`
                  : 'Connect to a Bluetooth device'
              }
              onPress={handleBluetoothPress}
              style={[styles.bluetoothButton, connectedDevice && styles.connectedButton]}
            >
              <Bluetooth color="#f47518" size={16} />
              <Text numberOfLines={1} style={styles.bluetoothText}>
                {bluetoothIsConnecting
                  ? 'CONNECTING'
                  : connectedDevice
                    ? nearbyDeviceName(connectedDevice).toUpperCase()
                    : 'BLUETOOTH'}
              </Text>
            </Pressable>

            <View style={styles.subNavRow}>
              <Pressable
                accessibilityRole="button"
                onPress={onOpenInstructions}
                style={[styles.topNavButton, styles.instructionButton]}
              >
                <BookOpen color="#f47518" size={13} />
                <Text style={styles.topNavText}>INSTRUCTION</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Settings"
                onPress={onOpenSettings}
                style={[styles.topNavButton, styles.settingsButton]}
              >
                <Settings color="#06324d" size={14} />
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.gamepadBody}>
          <View pointerEvents="none" style={styles.gamepadBridge} />

          <View style={styles.gripCircle}>
            <Joystick
              wheelType={driveProfile.wheelType}
              position={joystickPosition}
              gesture={joystickGesture}
              actionLabel={actionLabel}
            />
          </View>

          <View style={styles.centerButtons}>
            <FunctionButton
              label="FUNC 1"
              joystickGesture={joystickGesture}
              onPress={() => onAction('FUNC 1')}
            />
            <FunctionButton
              label="FUNC 2"
              joystickGesture={joystickGesture}
              onPress={() => onAction('FUNC 2')}
            />
            {driveProfile.wheelType !== 'standard' ? (
              <View style={styles.rotateControls}>
                <RotateHoldButton
                  label="XOAY TRÁI"
                  direction={-1}
                  onRotateChange={onRotateChange}
                />
                <RotateHoldButton
                  label="XOAY PHẢI"
                  direction={1}
                  onRotateChange={onRotateChange}
                />
              </View>
            ) : null}
          </View>

          <View style={styles.gripCircle}>
            <View style={styles.actionPad}>
              <ActionButton
                label="CẢN"
                accessibilityLabel="Cản banh"
                icon={<Triangle color="#fff" size={22} strokeWidth={2.5} />}
                style={styles.actionTop}
                joystickGesture={joystickGesture}
                onPress={() => onAction('BLOCK (CẢN BANH)')}
              />
              <ActionButton
                label="SÚT"
                accessibilityLabel="Sút banh"
                icon={<X color="#fff" size={24} strokeWidth={2.5} />}
                style={styles.actionBottom}
                joystickGesture={joystickGesture}
                onPress={() => onAction('KICK (SÚT BANH)')}
              />
              <ActionButton
                label="FUNC 3"
                accessibilityLabel="Chức năng 3"
                icon={<Square color="#fff" size={22} strokeWidth={2.2} />}
                style={styles.actionLeft}
                joystickGesture={joystickGesture}
                onPress={() => onAction('FUNC 3')}
              />
              <ActionButton
                label="FUNC 4"
                accessibilityLabel="Chức năng 4"
                icon={<Circle color="#fff" size={22} strokeWidth={2.2} />}
                style={styles.actionRight}
                joystickGesture={joystickGesture}
                onPress={() => onAction('FUNC 4')}
              />
            </View>
          </View>
        </View>
      </View>
      <BluetoothPicker
        visible={bluetoothPickerVisible}
        devices={bluetoothDevices}
        isScanning={bluetoothIsScanning}
        isConnecting={bluetoothIsConnecting}
        connectedDevice={connectedDevice}
        error={bluetoothError}
        onClose={handleBluetoothPickerClose}
        onScan={onBluetoothScan}
        onConnect={onBluetoothConnect}
        onDisconnect={onBluetoothDisconnect}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  canvas: {
    alignItems: 'center',
    height: CANVAS_HEIGHT,
    justifyContent: 'center',
    width: CANVAS_WIDTH,
  },
  topBar: {
    alignItems: 'flex-start',
    elevation: 5,
    flexDirection: 'row',
    height: 82,
    justifyContent: 'space-between',
    marginBottom: 10,
    position: 'relative',
    width: 820,
    zIndex: 5,
  },
  brand: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 5,
    width: 200,
  },
  logo: {
    height: 44,
    width: 44,
  },
  brandName: {
    color: '#06324d',
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '900',
  },
  brandAccent: {
    color: '#0b8795',
  },
  levelGroup: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#cbd5e1',
    borderRadius: 12,
    borderWidth: 1,
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    position: 'relative',
    zIndex: 10,
  },
  wheelTypeLabel: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '700',
  },
  quickSwitchRow: {
    flexDirection: 'row',
    gap: 4,
  },
  quickSwitchButton: {
    alignItems: 'center',
    backgroundColor: '#e2e8f0',
    borderRadius: 5,
    height: 24,
    justifyContent: 'center',
    width: 28,
  },
  quickSwitchButtonActive: {
    backgroundColor: '#f47518',
  },
  quickSwitchText: {
    color: '#334155',
    fontSize: 10,
    fontWeight: '800',
  },
  quickSwitchTextActive: {
    color: '#fff',
  },
  rightTopStack: {
    alignItems: 'stretch',
    gap: 6,
  },
  bluetoothButton: {
    alignItems: 'center',
    backgroundColor: '#06324d',
    borderBottomLeftRadius: 12,
    borderTopRightRadius: 12,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    width: 150,
  },
  connectedButton: {
    backgroundColor: '#16a34a',
  },
  bluetoothText: {
    color: '#fff',
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  subNavRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  topNavButton: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#06324d',
    borderRadius: 8,
    borderWidth: 1.5,
    flexDirection: 'row',
    height: 28,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  instructionButton: {
    flex: 1,
    gap: 4,
    paddingHorizontal: 10,
  },
  settingsButton: {
    width: 36,
  },
  topNavText: {
    color: '#06324d',
    fontSize: 10,
    fontWeight: '700',
  },
  gamepadBody: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 320,
    justifyContent: 'space-between',
    position: 'relative',
    width: 780,
  },
  gamepadBridge: {
    backgroundColor: '#06324d',
    height: 210,
    left: '50%',
    position: 'absolute',
    top: 20,
    transform: [{ translateX: -170 }],
    width: 340,
    zIndex: 0,
  },
  gripCircle: {
    alignItems: 'center',
    backgroundColor: '#06324d',
    borderRadius: 155,
    elevation: 10,
    height: 310,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    width: 310,
    zIndex: 1,
  },
  joystick: {
    alignItems: 'center',
    backgroundColor: '#042337',
    borderColor: '#0b476b',
    borderRadius: 95,
    borderWidth: 4,
    height: JOYSTICK_SIZE,
    justifyContent: 'center',
    width: JOYSTICK_SIZE,
  },
  arrowUp: {
    position: 'absolute',
    top: 8,
  },
  arrowDown: {
    bottom: 8,
    position: 'absolute',
  },
  arrowLeft: {
    left: 8,
    position: 'absolute',
  },
  arrowRight: {
    position: 'absolute',
    right: 8,
  },
  joystickKnob: {
    alignItems: 'center',
    backgroundColor: '#f47518',
    borderColor: '#ffad66',
    borderRadius: 30,
    borderWidth: 4,
    elevation: 5,
    height: 60,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    width: 60,
  },
  joystickKnobInner: {
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 12,
    borderWidth: 2,
    height: 24,
    width: 24,
  },
  centerButtons: {
    alignItems: 'center',
    gap: 12,
    marginTop: -40,
    zIndex: 2,
  },
  rotateControls: {
    flexDirection: 'row',
    gap: 6,
  },
  rotateButton: {
    alignItems: 'center',
    backgroundColor: '#0b8795',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: 8,
  },
  rotateButtonText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
  functionButton: {
    alignItems: 'center',
    backgroundColor: '#f47518',
    borderColor: '#fff',
    borderRadius: 20,
    borderWidth: 2,
    elevation: 3,
    justifyContent: 'center',
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    width: 105,
  },
  functionText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  actionPad: {
    height: 220,
    position: 'relative',
    width: 220,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: '#f47518',
    borderRadius: 35,
    elevation: 4,
    height: 70,
    justifyContent: 'center',
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    width: 70,
  },
  actionTop: {
    left: 75,
    top: 0,
  },
  actionBottom: {
    bottom: 0,
    left: 75,
  },
  actionLeft: {
    left: 0,
    top: 75,
  },
  actionRight: {
    right: 0,
    top: 75,
  },
  actionLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  pressedButton: {
    backgroundColor: '#10b981',
    borderColor: '#d1fae5',
    opacity: 0.95,
    transform: [{ scale: 0.94 }],
  },
});
