import { StatusBar } from 'expo-status-bar';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  useWindowDimensions,
  PanResponder,
  Animated,
} from 'react-native';
import { useState, useRef } from 'react';

// 1. Kiểu dữ liệu
type DirectionInput = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type ControlMode = 'MODE_1' | 'MODE_2';

// 2. Component nút điều hướng (Dùng cho Mode 1)
type ControlButtonProps = {
  iconName: keyof typeof Ionicons.glyphMap;
  direction: DirectionInput;
  onPressIn: (direction: DirectionInput) => void;
  onPressOut: (direction: DirectionInput) => void;
  size: number;
};

function ControlButton({
  iconName,
  direction,
  onPressIn,
  onPressOut,
  size,
}: ControlButtonProps) {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <View
      style={[
        styles.controlButton,
        { width: size, height: size },
        isPressed && styles.controlButtonPressed,
      ]}
      onTouchStart={() => {
        setIsPressed(true);
        onPressIn(direction);
      }}
      onTouchEnd={() => {
        setIsPressed(false);
        onPressOut(direction);
      }}
      onTouchCancel={() => {
        setIsPressed(false);
        onPressOut(direction);
      }}
    >
      <View
        style={[
          styles.controlButtonInner,
          isPressed && styles.controlButtonInnerPressed,
        ]}
      >
        <Ionicons
          name={iconName}
          size={Math.floor(size * 0.42)}
          color={isPressed ? '#08252B' : '#BCF8F9'}
        />
      </View>
    </View>
  );
}

// 3. Component Joystick (Dùng cho Mode 2 - Đã bỏ hiển thị tọa độ X/Y)
type VirtualJoystickProps = {
  size?: number;
  onMove: (x: number, y: number) => void;
};

function VirtualJoystick({ size = 190, onMove }: VirtualJoystickProps) {
  const knobSize = size * 0.36;
  const maxRadius = (size - knobSize) / 2;

  const pan = useRef(new Animated.ValueXY()).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        let dx = gestureState.dx;
        let dy = gestureState.dy;

        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > maxRadius) {
          const angle = Math.atan2(dy, dx);
          dx = Math.cos(angle) * maxRadius;
          dy = Math.sin(angle) * maxRadius;
        }

        pan.setValue({ x: dx, y: dy });

        const normX = Math.round((dx / maxRadius) * 100);
        const normY = Math.round((-dy / maxRadius) * 100);
        onMove(normX, normY);
      },
      onPanResponderRelease: () => {
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
          friction: 5,
        }).start();
        onMove(0, 0);
      },
    }),
  ).current;

  return (
    <View style={styles.joystickWrapper}>
      <View
        style={[
          styles.joystickBase,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      >
        <View style={styles.crosshairHorizontal} />
        <View style={styles.crosshairVertical} />
        <View style={styles.joystickInnerRing} />

        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.joystickKnob,
            {
              width: knobSize,
              height: knobSize,
              borderRadius: knobSize / 2,
              transform: [{ translateX: pan.x }, { translateY: pan.y }],
            },
          ]}
        >
          <View style={styles.joystickKnobCore} />
        </Animated.View>
      </View>
    </View>
  );
}

// 4. Component cụm 4 nút Function (Chỉ cho phép chọn 1 Function duy nhất)
type FunctionButtonsProps = {
  selectedFunc: string | null;
  onSelectFunc: (key: string) => void;
  layout: 'grid' | 'row';
};

function FunctionButtons({
  selectedFunc,
  onSelectFunc,
  layout,
}: FunctionButtonsProps) {
  const buttons = ['F1', 'F2', 'F3', 'F4'];

  return (
    <View
      style={
        layout === 'grid' ? styles.funcGridContainer : styles.funcRowContainer
      }
    >
      {buttons.map((label) => {
        const isActive = selectedFunc === label;
        return (
          <Pressable
            key={label}
            onPress={() => onSelectFunc(label)}
            style={({ pressed }) => [
              styles.funcButton,
              layout === 'grid' ? styles.funcButtonGrid : styles.funcButtonRow,
              isActive && styles.funcButtonActive,
              pressed && styles.buttonPressedScale,
            ]}
          >
            <View
              style={[
                styles.funcLed,
                isActive ? styles.funcLedOn : styles.funcLedOff,
              ]}
            />
            <Text
              style={[
                styles.funcButtonText,
                isActive && styles.funcButtonTextActive,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// 5. Component điều chỉnh tốc độ motor (Chỉ giữ lại chỉ số)
type MotorSliderProps = {
  motorName: string;
  speed: number;
  onSpeedChange: (value: number) => void;
};

function MotorSlider({
  motorName,
  speed,
  onSpeedChange,
}: MotorSliderProps) {
  return (
    <View style={styles.motorCard}>
      <View style={styles.motorHeader}>
        <View style={styles.motorTitleRow}>
          <Ionicons name="speedometer-outline" size={14} color="#7AE4E6" />
          <Text style={styles.motorName}>{motorName}</Text>
        </View>
        <View style={styles.speedBadge}>
          <Text style={styles.speedValue}>{speed}</Text>
        </View>
      </View>

      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={255}
        step={1}
        value={speed}
        onValueChange={(value) => onSpeedChange(Math.round(value))}
        minimumTrackTintColor="#22D3EE"
        maximumTrackTintColor="#133842"
        thumbTintColor="#BCF8F9"
      />
    </View>
  );
}

// 6. Ứng dụng chính
export default function App() {
  const { width, height } = useWindowDimensions();

  const buttonSize = Math.min(
    130,
    Math.max(82, Math.floor(Math.min(width, height) * 0.18)),
  );

  const [mode, setMode] = useState<ControlMode>('MODE_1');
  const [btConnected, setBtConnected] = useState(false);
  const [guideVisible, setGuideVisible] = useState(false);

  const [pressedDirections, setPressedDirections] = useState<DirectionInput[]>(
    [],
  );
  const [motor1Speed, setMotor1Speed] = useState(128);
  const [motor2Speed, setMotor2Speed] = useState(128);

  const [selectedFunc, setSelectedFunc] = useState<string | null>(null);

  const handleSelectFunc = (key: string) => {
    setSelectedFunc((prev) => (prev === key ? null : key));
  };

  const handlePressIn = (input: DirectionInput) => {
    setPressedDirections((prev) =>
      prev.includes(input) ? prev : [...prev, input],
    );
  };

  const handlePressOut = (input: DirectionInput) => {
    setPressedDirections((prev) => prev.filter((item) => item !== input));
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
      >
        {/* KHUNG ĐIỀU KHIỂN CHÍNH */}
        <View style={styles.controlPanel}>
          {/* THANH TOP BAR: TRÁI TÊN NHÓM - PHẢI CÁC NÚT TAB */}
          <View style={styles.topBar}>
            {/* Bên trái: Watt'up Debuggers */}
            <View style={styles.brandContainer}>
              <Ionicons name="hardware-chip" size={20} color="#BCF8F9" />
              <Text style={styles.brandText}>Watt'up Debuggers</Text>
            </View>

            {/* Bên phải: Mode 1, Mode 2, Bluetooth, Hướng dẫn */}
            <View style={styles.topRightActions}>
              <Pressable
                onPress={() => setMode('MODE_1')}
                style={({ pressed }) => [
                  styles.topActionButton,
                  mode === 'MODE_1' && styles.modeButtonActive,
                  pressed && styles.buttonPressedScale,
                ]}
              >
                <Ionicons
                  name="keypad-outline"
                  size={14}
                  color={mode === 'MODE_1' ? '#08252B' : '#88C9CE'}
                />
                <Text
                  style={[
                    styles.topActionText,
                    mode === 'MODE_1' && styles.topActionTextActive,
                  ]}
                >
                  MODE 1
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setMode('MODE_2')}
                style={({ pressed }) => [
                  styles.topActionButton,
                  mode === 'MODE_2' && styles.modeButtonActive,
                  pressed && styles.buttonPressedScale,
                ]}
              >
                <Ionicons
                  name="game-controller-outline"
                  size={14}
                  color={mode === 'MODE_2' ? '#08252B' : '#88C9CE'}
                />
                <Text
                  style={[
                    styles.topActionText,
                    mode === 'MODE_2' && styles.topActionTextActive,
                  ]}
                >
                  MODE 2
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setBtConnected(!btConnected)}
                style={({ pressed }) => [
                  styles.topActionButton,
                  btConnected
                    ? styles.btButtonConnected
                    : styles.btButtonDisconnected,
                  pressed && styles.buttonPressedScale,
                ]}
              >
                <Ionicons
                  name="bluetooth"
                  size={14}
                  color={btConnected ? '#08252B' : '#88C9CE'}
                />
                <Text
                  style={[
                    styles.topActionText,
                    btConnected && styles.btButtonConnectedText,
                  ]}
                >
                  {btConnected ? 'CONNECTED' : 'BLUETOOTH'}
                </Text>
              </Pressable>

              {/* Nút Hướng dẫn (Đã sửa tên & chống crash) */}
              <Pressable
                onPress={() => setGuideVisible(true)}
                style={({ pressed }) => [
                  styles.topActionButton,
                  styles.guideButton,
                  pressed && styles.buttonPressedScale,
                ]}
              >
                <Ionicons name="book-outline" size={14} color="#BCF8F9" />
                <Text style={styles.topActionTextGuide}>HƯỚNG DẪN</Text>
              </Pressable>
            </View>
          </View>

          {/* KHU VỰC ĐIỀU KHIỂN CHÍNH THEO CHẾ ĐỘ */}
          {mode === 'MODE_1' ? (
            /* ================= CHẾ ĐỘ 1 ================= */
            <View style={styles.mainControl}>
              {/* BÊN TRÁI: UP / DOWN */}
              <View style={styles.leftColumnMode1}>
                <ControlButton
                  iconName="caret-up"
                  direction="UP"
                  size={buttonSize}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                />
                <ControlButton
                  iconName="caret-down"
                  direction="DOWN"
                  size={buttonSize}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                />
              </View>

              {/* CHÍNH GIỮA: 4 NÚT FUNCTION (F1 - F4) */}
              <View style={styles.centerColumnMode1}>
                <FunctionButtons
                  selectedFunc={selectedFunc}
                  onSelectFunc={handleSelectFunc}
                  layout="grid"
                />
              </View>

              {/* BÊN PHẢI: MOTOR SLIDER + LEFT / RIGHT */}
              <View style={styles.rightColumnMode1}>
                <View style={styles.motorControls}>
                  <MotorSlider
                    motorName="MOTOR 1"
                    speed={motor1Speed}
                    onSpeedChange={setMotor1Speed}
                  />
                  <MotorSlider
                    motorName="MOTOR 2"
                    speed={motor2Speed}
                    onSpeedChange={setMotor2Speed}
                  />
                </View>

                <View style={styles.horizontalControls}>
                  <ControlButton
                    iconName="caret-back"
                    direction="LEFT"
                    size={buttonSize}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                  />
                  <ControlButton
                    iconName="caret-forward"
                    direction="RIGHT"
                    size={buttonSize}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                  />
                </View>
              </View>
            </View>
          ) : (
            /* ================= CHẾ ĐỘ 2 ================= */
            <View style={styles.mainControl}>
              {/* BÊN TRÁI: JOYSTICK */}
              <View style={styles.leftColumnMode2}>
                <VirtualJoystick
                  size={Math.min(230, Math.floor(height * 0.6))}
                  onMove={(x, y) => {
                    // Xử lý tọa độ joystick gửi qua Bluetooth
                  }}
                />
              </View>

              {/* BÊN PHẢI: MOTOR SLIDERS + 4 FUNC BÊN DƯỚI */}
              <View style={styles.rightColumnMode2}>
                <View style={styles.motorControls}>
                  <MotorSlider
                    motorName="MOTOR 1"
                    speed={motor1Speed}
                    onSpeedChange={setMotor1Speed}
                  />
                  <MotorSlider
                    motorName="MOTOR 2"
                    speed={motor2Speed}
                    onSpeedChange={setMotor2Speed}
                  />
                </View>

                <View style={styles.funcUnderMotorWrapper}>
                  <FunctionButtons
                    selectedFunc={selectedFunc}
                    onSelectFunc={handleSelectFunc}
                    layout="row"
                  />
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* CỬA SỔ HƯỚNG DẪN DẠNG OVERLAY (KHÔNG DÙNG MODAL ĐỂ TRÁNH VĂNG APP) */}
      {guideVisible && (
        <View style={styles.overlayBackdrop}>
          <View style={styles.overlayCard}>
            <View style={styles.modalHeader}>
              <Ionicons name="book" size={18} color="#BCF8F9" />
              <Text style={styles.modalTitle}>HƯỚNG DẪN SỬ DỤNG - WATT'UP</Text>
              <Pressable
                onPress={() => setGuideVisible(false)}
                hitSlop={10}
              >
                <Ionicons name="close" size={22} color="#88C9CE" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <View style={styles.guideSection}>
                <Text style={styles.guideHeading}>1. Chọn phần cứng (Hardware)</Text>
                <Text style={styles.guideText}>
                  • Vi điều khiển: ESP32 NodeMCU hoặc Arduino kết hợp module Bluetooth HC-05 / HC-06.{'\n'}
                  • Mạch điều khiển động cơ: L298N hoặc mạch cầu H tương thích PWM.{'\n'}
                  • Nguồn điện ổn định cho xe điều khiển cấp THPT (5V - 12V).
                </Text>
              </View>

              <View style={styles.guideSection}>
                <Text style={styles.guideHeading}>2. Kết nối không dây (Connection)</Text>
                <Text style={styles.guideText}>
                  • Bật Bluetooth trên điện thoại và nguồn của xe.{'\n'}
                  • Nhấn nút <Text style={{ color: '#BCF8F9', fontWeight: 'bold' }}>BLUETOOTH</Text> trên app để quét và ghép nối với thiết bị phần cứng của đội.{'\n'}
                  • Đảm bảo khoảng cách ổn định trong phạm vi 5–6 mét theo yêu cầu cuộc thi.
                </Text>
              </View>

              <View style={styles.guideSection}>
                <Text style={styles.guideHeading}>3. Cấu hình UUID cho ESP32</Text>
                <Text style={styles.guideText}>
                  • Định nghĩa Service UUID và Characteristic UUID trong code Arduino/ESP32 trùng khớp với mã UUID cấu hình trên App BLE.{'\n'}
                  • Gói tin truyền đi theo chuẩn chuỗi ký tự hoặc cấu trúc JSON gọn nhẹ để vi điều khiển dễ dàng xử lý lệnh từ Joystick hoặc F1-F4.
                </Text>
              </View>
            </ScrollView>

            <Pressable
              style={styles.modalCloseButton}
              onPress={() => setGuideVisible(false)}
            >
              <Text style={styles.modalCloseButtonText}>ĐÃ HIỂU</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

// 7. STYLES
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#041518',
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 8,
  },

  controlPanel: {
    width: '100%',
    flex: 1,
    minHeight: 0,
    borderWidth: 1.5,
    borderColor: '#0D3B44',
    borderRadius: 20,
    backgroundColor: '#071F24',
    overflow: 'hidden',
    shadowColor: '#BCF8F9',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },

  // ================= TOP BAR =================
  topBar: {
    minHeight: 60,
    borderBottomWidth: 1.5,
    borderBottomColor: '#0D3B44',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#0D192B',
  },

  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  brandText: {
    color: '#BCF8F9',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  topActionButton: {
    height: 36,
    paddingHorizontal: 10,
    backgroundColor: '#0B333B',
    borderWidth: 1.5,
    borderColor: '#114B57',
    borderRadius: 9,
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },

  modeButtonActive: {
    backgroundColor: '#BCF8F9',
    borderColor: '#7AE4E6',
    shadowColor: '#BCF8F9',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },

  btButtonDisconnected: {
    backgroundColor: '#0E2A30',
    borderColor: '#184852',
  },

  btButtonConnected: {
    backgroundColor: '#38BDF8',
    borderColor: '#7AE4E6',
    shadowColor: '#38BDF8',
    shadowOpacity: 0.5,
  },

  btButtonConnectedText: {
    color: '#08252B',
    fontWeight: '900',
  },

  guideButton: {
    backgroundColor: '#0E3B43',
    borderColor: '#19616E',
  },

  topActionText: {
    color: '#88C9CE',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  topActionTextActive: {
    color: '#08252B',
    fontWeight: '900',
  },

  topActionTextGuide: {
    color: '#BCF8F9',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  buttonPressedScale: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },

  // ================= MAIN CONTROL CHUNG =================
  mainControl: {
    flex: 1,
    minHeight: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },

  // ================= LAYOUT MODE 1 =================
  leftColumnMode1: {
    flex: 0.9,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },

  centerColumnMode1: {
    flex: 1.15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rightColumnMode1: {
    flex: 1.75,
    justifyContent: 'space-between',
    gap: 10,
  },

  horizontalControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 22,
  },

  // ================= LAYOUT MODE 2 =================
  leftColumnMode2: {
    flex: 1.1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rightColumnMode2: {
    flex: 1.4,
    justifyContent: 'center',
    gap: 16,
    paddingLeft: 10,
  },

  funcUnderMotorWrapper: {
    width: '100%',
    marginTop: 4,
  },

  // ================= CONTROL BUTTONS (MODE 1) =================
  controlButton: {
    borderWidth: 1.5,
    borderColor: '#124552',
    borderRadius: 18,
    backgroundColor: '#092A31',
    padding: 5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#BCF8F9',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  controlButtonPressed: {
    backgroundColor: '#BCF8F9',
    borderColor: '#7AE4E6',
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },

  controlButtonInner: {
    flex: 1,
    width: '100%',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(188, 248, 249, 0.2)',
    backgroundColor: '#0C353E',
    alignItems: 'center',
    justifyContent: 'center',
  },

  controlButtonInnerPressed: {
    backgroundColor: '#BCF8F9',
    borderColor: '#FFFFFF',
  },

  // ================= FUNCTION BUTTONS (F1 - F4) =================
  funcGridContainer: {
    width: '100%',
    maxWidth: 210,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },

  funcRowContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },

  funcButton: {
    backgroundColor: '#092A31',
    borderWidth: 1.5,
    borderColor: '#124552',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  funcButtonGrid: {
    width: '45%',
    aspectRatio: 1.25,
  },

  funcButtonRow: {
    flex: 1,
    height: 52,
  },

  funcButtonActive: {
    backgroundColor: '#0E5C6B',
    borderColor: '#BCF8F9',
    shadowColor: '#BCF8F9',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },

  funcLed: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },

  funcLedOff: {
    backgroundColor: '#1E4E59',
  },

  funcLedOn: {
    backgroundColor: '#BCF8F9',
    shadowColor: '#BCF8F9',
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },

  funcButtonText: {
    color: '#88C9CE',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },

  funcButtonTextActive: {
    color: '#FFFFFF',
  },

  // ================= JOYSTICK (MODE 2) =================
  joystickWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  joystickBase: {
    backgroundColor: '#051B20',
    borderWidth: 2,
    borderColor: '#124552',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#BCF8F9',
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 6,
  },

  joystickInnerRing: {
    position: 'absolute',
    width: '55%',
    height: '55%',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(188, 248, 249, 0.2)',
    borderStyle: 'dashed',
  },

  crosshairHorizontal: {
    position: 'absolute',
    width: '85%',
    height: 1,
    backgroundColor: 'rgba(188, 248, 249, 0.15)',
  },

  crosshairVertical: {
    position: 'absolute',
    width: 1,
    height: '85%',
    backgroundColor: 'rgba(188, 248, 249, 0.15)',
  },

  joystickKnob: {
    backgroundColor: '#0E5C6B',
    borderWidth: 2,
    borderColor: '#BCF8F9',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#BCF8F9',
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },

  joystickKnobCore: {
    width: '40%',
    height: '40%',
    borderRadius: 999,
    backgroundColor: '#BCF8F9',
  },

  // ================= MOTOR SLIDERS =================
  motorControls: {
    width: '100%',
    gap: 8,
  },

  motorCard: {
    width: '100%',
    backgroundColor: '#082329',
    borderWidth: 1.5,
    borderColor: '#124552',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },

  motorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  motorTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  motorName: {
    color: '#88C9CE',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },

  speedBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },

  speedValue: {
    color: '#BCF8F9',
    fontSize: 14,
    fontWeight: '900',
  },

  slider: {
    width: '100%',
    height: 26,
  },

  // ================= OVERLAY GUIDE STYLES =================
  overlayBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(4, 21, 24, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 999,
  },

  overlayCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
    backgroundColor: '#071F24',
    borderWidth: 1.5,
    borderColor: '#124552',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#BCF8F9',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#09272D',
    borderBottomWidth: 1.5,
    borderBottomColor: '#124552',
  },

  modalTitle: {
    color: '#BCF8F9',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },

  modalBody: {
    padding: 16,
    gap: 16,
  },

  guideSection: {
    gap: 6,
  },

  guideHeading: {
    color: '#BCF8F9',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  guideText: {
    color: '#88C9CE',
    fontSize: 11,
    lineHeight: 18,
  },

  modalCloseButton: {
    backgroundColor: '#0E5C6B',
    borderTopWidth: 1.5,
    borderTopColor: '#124552',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalCloseButtonText: {
    color: '#BCF8F9',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
});
