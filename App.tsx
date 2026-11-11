
import { StatusBar } from 'expo-status-bar';
import Slider from '@react-native-community/slider';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useState } from 'react';

// 1. Các hướng di chuyển
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

// 2. Component điều chỉnh tốc độ motor bằng Slider
type MotorSpeedControlProps = {
  motorName: string;
  speed: number;
  onSpeedChange: (value: number) => void;
};

function MotorSpeedControl({
  motorName,
  speed,
  onSpeedChange,
}: MotorSpeedControlProps) {
  return (
    <View style={styles.motorCard}>
      <View style={styles.motorHeader}>
        <Text style={styles.motorName}>{motorName}</Text>
        <Text style={styles.speedValue}>{speed}/255</Text>
      </View>

      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={255}
        step={1}
        value={speed}
        onValueChange={onSpeedChange}
        minimumTrackTintColor="#3B82F6"
        maximumTrackTintColor="#334155"
        thumbTintColor="#60A5FA"
      />

      <View style={styles.sliderLabels}>
        <Text style={styles.sliderLabel}>0</Text>
        <Text style={styles.sliderLabel}>255</Text>
      </View>
    </View>
  );
}

// 3. Component nút điều khiển hướng
type DirectionButtonProps = {
  label: string;
  direction: Direction;
  onPressIn: (direction: Direction) => void;
  onPressOut: () => void;
};

function DirectionButton({
  label,
  direction,
  onPressIn,
  onPressOut,
}: DirectionButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.directionButton,
        pressed && styles.directionButtonPressed,
      ]}
      onPressIn={() => onPressIn(direction)}
      onPressOut={onPressOut}
    >
      <Text style={styles.directionText}>{label}</Text>
    </Pressable>
  );
}

// 4. Component chính
export default function App() {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const [direction, setDirection] = useState<Direction>('STOP');

  const [motor1Speed, setMotor1Speed] = useState(128);
  const [motor2Speed, setMotor2Speed] = useState(128);

  const [function1, setFunction1] = useState(false);
  const [function2, setFunction2] = useState(false);

  // Dừng robot
  const emergencyStop = () => {
    setDirection('STOP');
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.container,
        isLandscape && styles.landscapeContainer,
      ]}
    >
      <StatusBar style="light" />

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>ROBOT CONTROLLER</Text>
          <Text style={styles.subtitle}>Robot Control System</Text>
        </View>

        <View style={styles.statusBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>OFFLINE</Text>
        </View>
      </View>

      {/* CONNECTION STATUS */}
      <View style={styles.connectionCard}>
        <Text style={styles.sectionTitle}>CONNECTION</Text>
        <Text style={styles.connectionText}>
          Robot is not connected
        </Text>
      </View>

      {/* MAIN RESPONSIVE LAYOUT */}
      <View
        style={[
          styles.mainLayout,
          isLandscape
            ? styles.landscapeLayout
            : styles.portraitLayout,
        ]}
      >
        {/* LEFT: MOVEMENT CONTROL */}
        <View
          style={[
            styles.movementSection,
            isLandscape && styles.landscapeMovement,
          ]}
        >
          <Text style={styles.sectionTitle}>MOVEMENT CONTROL</Text>

          <View style={styles.directionGrid}>
            <DirectionButton
              label="↖"
              direction="FORWARD_LEFT"
              onPressIn={setDirection}
              onPressOut={() => setDirection('STOP')}
            />

            <DirectionButton
              label="↑"
              direction="FORWARD"
              onPressIn={setDirection}
              onPressOut={() => setDirection('STOP')}
            />

            <DirectionButton
              label="↗"
              direction="FORWARD_RIGHT"
              onPressIn={setDirection}
              onPressOut={() => setDirection('STOP')}
            />

            <DirectionButton
              label="←"
              direction="LEFT"
              onPressIn={setDirection}
              onPressOut={() => setDirection('STOP')}
            />

            <Pressable
              style={styles.stopButton}
              onPress={emergencyStop}
            >
              <Text style={styles.stopText}>STOP</Text>
            </Pressable>

            <DirectionButton
              label="→"
              direction="RIGHT"
              onPressIn={setDirection}
              onPressOut={() => setDirection('STOP')}
            />

            <DirectionButton
              label="↙"
              direction="BACKWARD_LEFT"
              onPressIn={setDirection}
              onPressOut={() => setDirection('STOP')}
            />

            <DirectionButton
              label="↓"
              direction="BACKWARD"
              onPressIn={setDirection}
              onPressOut={() => setDirection('STOP')}
            />

            <DirectionButton
              label="↘"
              direction="BACKWARD_RIGHT"
              onPressIn={setDirection}
              onPressOut={() => setDirection('STOP')}
            />
          </View>

          <View style={styles.currentDirection}>
            <Text style={styles.currentDirectionLabel}>
              CURRENT DIRECTION
            </Text>
            <Text style={styles.currentDirectionValue}>
              {direction}
            </Text>
          </View>
        </View>

        {/* RIGHT: MOTOR + FUNCTIONS */}
        <View
          style={[
            styles.rightPanel,
            isLandscape && styles.landscapeRightPanel,
          ]}
        >
          {/* MOTOR SPEED */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              MOTOR SPEED CONTROL
            </Text>

            <MotorSpeedControl
              motorName="MOTOR 1"
              speed={motor1Speed}
              onSpeedChange={setMotor1Speed}
            />

            <MotorSpeedControl
              motorName="MOTOR 2"
              speed={motor2Speed}
              onSpeedChange={setMotor2Speed}
            />
          </View>

          {/* FUNCTION BUTTONS */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>FUNCTIONS</Text>

            <View style={styles.functionRow}>
              <Pressable
                style={[
                  styles.functionButton,
                  function1 && styles.functionActive,
                ]}
                onPress={() => setFunction1(!function1)}
              >
                <Text style={styles.functionText}>FUNCTION 1</Text>
                <Text style={styles.functionState}>
                  {function1 ? 'ON' : 'OFF'}
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.functionButton,
                  function2 && styles.functionActive,
                ]}
                onPress={() => setFunction2(!function2)}
              >
                <Text style={styles.functionText}>FUNCTION 2</Text>
                <Text style={styles.functionState}>
                  {function2 ? 'ON' : 'OFF'}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* EMERGENCY STOP */}
          <Pressable
            style={styles.emergencyButton}
            onPress={emergencyStop}
          >
            <Text style={styles.emergencyText}>
              EMERGENCY STOP
            </Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.footer}>
        ROBOT CONTROLLER • MVP 1.0
      </Text>
    </ScrollView>
  );
}

// 5. STYLES
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#101827',
  },
  container: {
    padding: 20,
    paddingTop: 55,
    paddingBottom: 40,
  },
  landscapeContainer: {
    paddingTop: 25,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B2028',
    padding: 9,
    borderRadius: 20,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    marginRight: 6,
  },
  statusText: {
    color: '#FCA5A5',
    fontSize: 10,
    fontWeight: 'bold',
  },
  connectionCard: {
    backgroundColor: '#1E293B',
    padding: 14,
    borderRadius: 14,
    marginBottom: 22,
  },
  connectionText: {
    color: '#FCA5A5',
    fontSize: 14,
  },
  mainLayout: {
    width: '100%',
  },
  portraitLayout: {
    flexDirection: 'column',
  },
  landscapeLayout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 20,
  },
  movementSection: {
    marginBottom: 25,
  },
  landscapeMovement: {
    flex: 1,
    marginBottom: 0,
  },
  rightPanel: {
    width: '100%',
  },
  landscapeRightPanel: {
    flex: 1,
  },
  section: {
    marginBottom: 22,
  },
  sectionTitle: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 13,
  },
  directionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  directionButton: {
    width: '30%',
    height: 70,
    backgroundColor: '#253449',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  directionButtonPressed: {
    backgroundColor: '#2563EB',
  },
  directionText: {
    color: '#FFFFFF',
    fontSize: 32,
  },
  stopButton: {
    width: '30%',
    height: 70,
    backgroundColor: '#7F1D1D',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 17,
  },
  currentDirection: {
    marginTop: 14,
    padding: 13,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    alignItems: 'center',
  },
  currentDirectionLabel: {
    color: '#94A3B8',
    fontSize: 10,
  },
  currentDirectionValue: {
    color: '#60A5FA',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 5,
  },
  motorCard: {
    backgroundColor: '#1E293B',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  motorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  motorName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  speedValue: {
    color: '#60A5FA',
    fontWeight: 'bold',
    fontSize: 16,
  },
  slider: {
    width: '100%',
    height: 35,
    marginTop: 8,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLabel: {
    color: '#94A3B8',
    fontSize: 10,
  },
  functionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  functionButton: {
    flex: 1,
    backgroundColor: '#253449',
    padding: 14,
    borderRadius: 13,
    alignItems: 'center',
  },
  functionActive: {
    backgroundColor: '#166534',
  },
  functionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  functionState: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 7,
  },
  emergencyButton: {
    backgroundColor: '#DC2626',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  emergencyText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 1,
  },
  footer: {
    color: '#64748B',
    textAlign: 'center',
    fontSize: 10,
    marginTop: 5,
  },
});
