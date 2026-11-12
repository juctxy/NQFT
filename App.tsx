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
} from 'react-native';
import { useState } from 'react';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';

// 1. Kiểu dữ liệu cho 4 nút điều hướng
type DirectionInput = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

type Direction =
  | 'FORWARD'
  | 'BACKWARD'
  | 'LEFT'
  | 'RIGHT'
  | 'FORWARD_LEFT'
  | 'FORWARD_RIGHT'
  | 'BACKWARD_LEFT'
  | 'BACKWARD_RIGHT'
  | 'STOP';

// 2. Component nút điều hướng
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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Move ${direction.toLowerCase()}`}
      onPressIn={() => onPressIn(direction)}
      onPressOut={() => onPressOut(direction)}
      style={({ pressed }) => [
        styles.controlButton,
        { width: size, height: size },
        pressed && styles.controlButtonPressed,
      ]}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.controlButtonInner,
            pressed && styles.controlButtonInnerPressed,
          ]}
        >
          <Ionicons
            name={iconName}
            size={Math.floor(size * 0.42)}
            color={pressed ? '#FFFFFF' : '#7DD3FC'}
          />
        </View>
      )}
    </Pressable>
  );
}

// 3. Component hiển thị 8 hướng di chuyển (Dạng Radar HUD)
type DirectionIndicatorProps = {
  direction: Direction;
};

function DirectionIndicator({ direction }: DirectionIndicatorProps) {
  const arrows: {
    iconName: keyof typeof Ionicons.glyphMap;
    direction: Direction;
  }[] = [
    { iconName: 'arrow-up-outline', direction: 'FORWARD_LEFT' }, // Sẽ xoay -45 độ
    { iconName: 'arrow-up-outline', direction: 'FORWARD' },
    { iconName: 'arrow-up-outline', direction: 'FORWARD_RIGHT' }, // Sẽ xoay 45 độ
    { iconName: 'arrow-back-outline', direction: 'LEFT' },
    { iconName: 'radio-button-on', direction: 'STOP' },
    { iconName: 'arrow-forward-outline', direction: 'RIGHT' },
    { iconName: 'arrow-down-outline', direction: 'BACKWARD_LEFT' }, // Sẽ xoay 45 độ
    { iconName: 'arrow-down-outline', direction: 'BACKWARD' },
    { iconName: 'arrow-down-outline', direction: 'BACKWARD_RIGHT' }, // Sẽ xoay -45 độ
  ];

  const getRotation = (dir: Direction) => {
    switch (dir) {
      case 'FORWARD_LEFT':
      case 'BACKWARD_RIGHT':
        return '-45deg';
      case 'FORWARD_RIGHT':
      case 'BACKWARD_LEFT':
        return '45deg';
      default:
        return '0deg';
    }
  };

  return (
    <View style={styles.radarContainer}>
      {/* Vòng tròn định vị bên ngoài */}
      <View style={styles.radarOuterRing}>
        <View style={styles.indicatorGrid}>
          {arrows.map((item, index) => {
            const isActive = direction === item.direction;
            const isCenter = item.direction === 'STOP';

            return (
              <View key={index} style={styles.indicatorCell}>
                <View
                  style={[
                    styles.arrowWrapper,
                    isActive && !isCenter && styles.arrowWrapperActive,
                    isCenter && isActive && styles.centerWrapperActive,
                    { transform: [{ rotate: getRotation(item.direction) }] },
                  ]}
                >
                  <Ionicons
                    name={item.iconName}
                    size={isCenter ? 22 : 24}
                    color={
                      isActive
                        ? isCenter
                          ? '#F59E0B' // Tâm sáng cam khi STOP
                          : '#22D3EE' // Hướng sáng Cyan rực rỡ
                        : '#47698F' // Tăng độ sáng màu nền để không bị chìm
                    }
                  />
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Nhãn hiển thị trạng thái lệnh Telemetry */}
      <View style={styles.statusBadge}>
        <Text style={styles.statusBadgeText}>CMD: {direction}</Text>
      </View>
    </View>
  );
}

// 4. Component điều chỉnh tốc độ motor
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
  const percentage = Math.round((speed / 255) * 100);

  return (
    <View style={styles.motorCard}>
      <View style={styles.motorHeader}>
        <View style={styles.motorTitleRow}>
          <Ionicons name="speedometer-outline" size={14} color="#38BDF8" />
          <Text style={styles.motorName}>{motorName}</Text>
        </View>
        <View style={styles.speedBadge}>
          <Text style={styles.speedValue}>{speed}</Text>
          <Text style={styles.speedUnit}>PWM ({percentage}%)</Text>
        </View>
      </View>

      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={255}
        step={1}
        value={speed}
        onValueChange={(value) => onSpeedChange(Math.round(value))}
        minimumTrackTintColor="#06B6D4"
        maximumTrackTintColor="#1E3A5F"
        thumbTintColor="#22D3EE"
      />

      <View style={styles.sliderLabels}>
        <Text style={styles.sliderLabel}>MIN: 0</Text>
        <Text style={styles.sliderLabel}>MAX: 255</Text>
      </View>
    </View>
  );
}

// 5. Ứng dụng chính
export default function App() {
  const { width, height } = useWindowDimensions();

  const buttonSize = Math.min(
    145,
    Math.max(64, Math.floor(Math.min(width, height) * 0.22)),
  );

  const [pressedDirections, setPressedDirections] = useState<DirectionInput[]>(
    [],
  );
  const [motor1Speed, setMotor1Speed] = useState(128);
  const [motor2Speed, setMotor2Speed] = useState(128);

  // State giả lập cho các nút trên Top Bar
  const [func1Active, setFunc1Active] = useState(false);
  const [func2Active, setFunc2Active] = useState(false);
  const [btConnected, setBtConnected] = useState(false);

  const handlePressIn = (input: DirectionInput) => {
    setPressedDirections((previous) =>
      previous.includes(input) ? previous : [...previous, input],
    );
  };

  const handlePressOut = (input: DirectionInput) => {
    setPressedDirections((previous) =>
      previous.filter((item) => item !== input),
    );
  };

  const getCurrentDirection = (): Direction => {
    const up = pressedDirections.includes('UP');
    const down = pressedDirections.includes('DOWN');
    const left = pressedDirections.includes('LEFT');
    const right = pressedDirections.includes('RIGHT');

    const vertical = up === down ? null : up ? 'FORWARD' : 'BACKWARD';
    const horizontal = left === right ? null : left ? 'LEFT' : 'RIGHT';

    if (vertical === 'FORWARD' && horizontal === 'LEFT') return 'FORWARD_LEFT';
    if (vertical === 'FORWARD' && horizontal === 'RIGHT') return 'FORWARD_RIGHT';
    if (vertical === 'BACKWARD' && horizontal === 'LEFT') return 'BACKWARD_LEFT';
    if (vertical === 'BACKWARD' && horizontal === 'RIGHT') return 'BACKWARD_RIGHT';

    if (vertical === 'FORWARD') return 'FORWARD';
    if (vertical === 'BACKWARD') return 'BACKWARD';
    if (horizontal === 'LEFT') return 'LEFT';
    if (horizontal === 'RIGHT') return 'RIGHT';

    return 'STOP';
  };

  const currentDirection = getCurrentDirection();

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen}>
        <StatusBar style="light" />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          bounces={false}
        >
          <View style={styles.controlPanel}>
            <View style={styles.topBar}>
              <Pressable
                onPress={() => setFunc1Active(!func1Active)}
                style={({ pressed }) => [
                  styles.topButton,
                  func1Active && styles.topButtonActive,
                  pressed && styles.topButtonPressed,
                ]}
              >
                <Ionicons
                  name={func1Active ? 'flash' : 'flash-outline'}
                  size={16}
                  color="#FFFFFF"
                />
                <Text style={styles.topButtonText}>FUNC 1</Text>
              </Pressable>

              <Pressable
                onPress={() => setFunc2Active(!func2Active)}
                style={({ pressed }) => [
                  styles.topButton,
                  func2Active && styles.topButtonActive,
                  pressed && styles.topButtonPressed,
                ]}
              >
                <Ionicons
                  name={func2Active ? 'aperture' : 'aperture-outline'}
                  size={16}
                  color="#FFFFFF"
                />
                <Text style={styles.topButtonText}>FUNC 2</Text>
              </Pressable>

              <Pressable
                onPress={() => setBtConnected(!btConnected)}
                style={({ pressed }) => [
                  styles.topButton,
                  btConnected ? styles.btButtonConnected : styles.btButtonDisconnected,
                  pressed && styles.topButtonPressed,
                ]}
              >
                <Ionicons
                  name="bluetooth"
                  size={16}
                  color={btConnected ? '#FFFFFF' : '#94A3B8'}
                />
                <Text
                  style={[
                    styles.topButtonText,
                    !btConnected && { color: '#CBD5E1' },
                  ]}
                >
                  {btConnected ? 'CONNECTED' : 'BLUETOOTH'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.mainControl}>
              <View style={styles.verticalControls}>
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

              <View style={styles.centerIndicator}>
                <DirectionIndicator direction={currentDirection} />
              </View>

              <View style={styles.rightControls}>
                <View style={styles.motorControls}>
                  <MotorSlider
                    motorName="MOTOR L (1)"
                    speed={motor1Speed}
                    onSpeedChange={setMotor1Speed}
                  />

                  <MotorSlider
                    motorName="MOTOR R (2)"
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
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

// 6. STYLES
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#050B14',
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  controlPanel: {
    width: '100%',
    minHeight: 260,
    borderWidth: 1.5,
    borderColor: '#1E3A5F',
    borderRadius: 20,
    backgroundColor: '#0A1322',
    overflow: 'hidden',
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },

  // TOP BAR
  topBar: {
    minHeight: 50,
    borderBottomWidth: 1.5,
    borderBottomColor: '#1E3A5F',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 3,
    backgroundColor: '#0D192B',
  },

  topButton: {
    flex: 1,
    maxWidth: 185,
    height: 44,
    backgroundColor: '#065F46', // Xanh lá đậm công nghệ
    borderWidth: 1.5,
    borderColor: '#10B981',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },

  topButtonActive: {
    backgroundColor: '#059669',
    borderColor: '#6EE7B7',
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },

  btButtonDisconnected: {
    backgroundColor: '#1E293B',
    borderColor: '#475569',
    shadowOpacity: 0,
  },

  btButtonConnected: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
    shadowColor: '#38BDF8',
    shadowOpacity: 0.5,
  },

  topButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },

  topButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  // MAIN CONTROL
  mainControl: {
    flex: 1,
    minHeight: 210,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },

  verticalControls: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    gap: 8,
  },

  controlButton: {
    borderWidth: 1.5,
    borderColor: '#254E7A',
    borderRadius: 20,
    backgroundColor: '#0F2138',
    padding: 5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },

  controlButtonPressed: {
    backgroundColor: '#0369A1',
    borderColor: '#22D3EE',
    shadowOpacity: 0.7,
    shadowRadius: 14,
    elevation: 10,
  },

  controlButtonInner: {
    flex: 1,
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.15)',
    backgroundColor: '#132946',
    alignItems: 'center',
    justifyContent: 'center',
  },

  controlButtonInnerPressed: {
    backgroundColor: '#0284C7',
    borderColor: '#7DD3FC',
  },

  // DIRECTION INDICATOR (RADAR HUD)
  centerIndicator: {
    flex: 1.25,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },

  radarContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  radarOuterRing: {
    width: '92%',
    aspectRatio: 1,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#1E3A5F',
    backgroundColor: '#08111E',
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#06B6D4',
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },

  indicatorGrid: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  indicatorCell: {
    width: '33.333%',
    height: '33.333%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  arrowWrapper: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },

  arrowWrapperActive: {
    backgroundColor: 'rgba(34, 211, 238, 0.18)',
    borderWidth: 1,
    borderColor: '#22D3EE',
  },

  centerWrapperActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.5)',
  },

  statusBadge: {
    backgroundColor: '#0F2138',
    borderWidth: 1,
    borderColor: '#1E3A5F',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },

  statusBadgeText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },

  rightControls: {
    flex: 2,
    minWidth: 0,
    justifyContent: 'space-evenly',
    gap: 6,
  },

  motorControls: {
    width: '100%',
    gap: 6,
  },

  motorCard: {
    width: '100%',
    backgroundColor: '#0E1C30',
    borderWidth: 1.5,
    borderColor: '#1E3A5F',
    borderRadius: 12,
    paddingHorizontal: 10,
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
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },

  speedBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },

  speedValue: {
    color: '#22D3EE',
    fontSize: 14,
    fontWeight: '900',
  },

  speedUnit: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '700',
  },

  slider: {
    width: '100%',
    height: 22,
  },

  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  sliderLabel: {
    color: '#64748B',
    fontSize: 8,
    fontWeight: '700',
  },

  horizontalControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },

});