import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import Slider from '@react-native-community/slider';
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
import {
  clampJoystick,
  determineDirection,
  getChangedCommand,
  type CommandType,
  type DriveProfileId,
  type DriveProfiles,
} from '../controller';
import { SpeedPresetSelector } from './SpeedPresetSelector';

const CANVAS_WIDTH = 840;
const CANVAS_HEIGHT = 430;
const JOYSTICK_SIZE = 190;
const JOYSTICK_RADIUS = 60;

interface ControllerScreenProps {
  motor1Speed: number;
  motor2Speed: number;
  driveProfiles: DriveProfiles;
  driveSettingsReady: boolean;
  command: string;
  bluetoothDevices: NearbyDevice[];
  connectedDevice: NearbyDevice | null;
  bluetoothIsScanning: boolean;
  bluetoothIsConnecting: boolean;
  bluetoothError: string | null;
  onMotor1SpeedChange: (value: number) => void;
  onMotor2SpeedChange: (value: number) => void;
  onSelectDriveProfile: (id: DriveProfileId) => void;
  onCommandChange: (command: CommandType) => void;
  onAction: (action: string) => void;
  onBluetoothScan: () => Promise<void>;
  onBluetoothStopScan: () => Promise<void>;
  onBluetoothConnect: (device: NearbyDevice) => Promise<void>;
  onBluetoothDisconnect: () => Promise<void>;
  onOpenInstructions: () => void;
  onOpenSettings: () => void;
}

function Joystick({
  command,
  position,
  gesture,
}: {
  command: string;
  position: Animated.ValueXY;
  gesture: PanGesture;
}) {
  return (
    <GestureDetector gesture={gesture}>
      <View
        accessibilityLabel="Eight-direction joystick"
        accessibilityHint={`Current command: ${command}`}
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

export function ControllerScreen({
  motor1Speed,
  motor2Speed,
  driveProfiles,
  driveSettingsReady,
  command,
  bluetoothDevices,
  connectedDevice,
  bluetoothIsScanning,
  bluetoothIsConnecting,
  bluetoothError,
  onMotor1SpeedChange,
  onMotor2SpeedChange,
  onSelectDriveProfile,
  onCommandChange,
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
  const lastPublishedCommand = useRef<CommandType>('STOP');
  const publishCommand = useCallback(
    (nextCommand: CommandType) => {
      const changedCommand = getChangedCommand(
        lastPublishedCommand.current,
        nextCommand,
      );
      if (changedCommand === null) return;

      lastPublishedCommand.current = changedCommand;
      onCommandChange(changedCommand);
    },
    [onCommandChange],
  );
  const updateJoystickPosition = useCallback(
    (x: number, y: number) => {
      const next = clampJoystick(
        x - JOYSTICK_SIZE / 2,
        y - JOYSTICK_SIZE / 2,
        JOYSTICK_RADIUS,
      );
      joystickPosition.setValue(next);
      publishCommand(determineDirection(next.x, next.y));
    },
    [joystickPosition, publishCommand],
  );
  const resetJoystick = useCallback(() => {
    joystickPosition.setValue({ x: 0, y: 0 });
    publishCommand('STOP');
  }, [joystickPosition, publishCommand]);
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

          <View style={styles.slidersGroup}>
            <View style={styles.sliderItem}>
              <Text style={styles.motorLabel}>M1:</Text>
              <Slider
                accessibilityLabel="M1 PWM speed"
                accessibilityValue={{ min: 0, max: 255, now: motor1Speed }}
                minimumValue={0}
                maximumValue={255}
                step={1}
                value={motor1Speed}
                onValueChange={onMotor1SpeedChange}
                minimumTrackTintColor="#f47518"
                maximumTrackTintColor="#444444"
                thumbTintColor="#f47518"
                style={styles.motorSlider}
              />
              <Text style={styles.sliderValue}>{motor1Speed}</Text>
            </View>

            <View style={styles.sliderItem}>
              <Text style={styles.motorLabel}>M2:</Text>
              <Slider
                accessibilityLabel="M2 PWM speed"
                accessibilityValue={{ min: 0, max: 255, now: motor2Speed }}
                minimumValue={0}
                maximumValue={255}
                step={1}
                value={motor2Speed}
                onValueChange={onMotor2SpeedChange}
                minimumTrackTintColor="#f47518"
                maximumTrackTintColor="#444444"
                thumbTintColor="#f47518"
                style={styles.motorSlider}
              />
              <Text style={styles.sliderValue}>{motor2Speed}</Text>
            </View>
            <SpeedPresetSelector
              profiles={driveProfiles}
              ready={driveSettingsReady}
              motor1Speed={motor1Speed}
              motor2Speed={motor2Speed}
              joystickGesture={joystickGesture}
              onSelectProfile={onSelectDriveProfile}
            />
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
              command={command}
              position={joystickPosition}
              gesture={joystickGesture}
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
  slidersGroup: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#cbd5e1',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    position: 'relative',
    zIndex: 10,
  },
  sliderItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  motorLabel: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  motorSlider: {
    height: 24,
    width: 104,
  },
  sliderValue: {
    color: '#f47518',
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: '700',
    minWidth: 30,
    textAlign: 'right',
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
    gap: 16,
    marginTop: -40,
    zIndex: 2,
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
