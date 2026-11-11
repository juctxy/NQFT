
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
} from 'react-native';
import { useState } from 'react';

// 1. Khai báo kiểu dữ liệu cho hướng di chuyển
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

// 2. Component điều chỉnh tốc độ motor
type MotorSpeedControlProps = {
  motorName: string;
  speed: number;
  onDecrease: () => void;
  onIncrease: () => void;
};

function MotorSpeedControl({
  motorName,
  speed,
  onDecrease,
  onIncrease,
}: MotorSpeedControlProps) {
  return (
    <View style={styles.motorCard}>
      <View style={styles.motorHeader}>
        <Text style={styles.motorName}>{motorName}</Text>
        <Text style={styles.speedValue}>{speed}/255</Text>
      </View>

      <View style={styles.progressBackground}>
        <View
          style={[
            styles.progressFill,
            { width: `${(speed / 255) * 100}%` },
          ]}
        />
      </View>

      <View style={styles.speedControls}>
        <Pressable style={styles.adjustButton} onPress={onDecrease}>
          <Text style={styles.adjustText}>−</Text>
        </Pressable>

        <Text style={styles.speedDescription}>Speed</Text>

        <Pressable style={styles.adjustButton} onPress={onIncrease}>
          <Text style={styles.adjustText}>+</Text>
        </Pressable>
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

// 4. Component chính của ứng dụng
export default function App() {
  const [direction, setDirection] = useState<Direction>('STOP');

  const [motor1Speed, setMotor1Speed] = useState(128);
  const [motor2Speed, setMotor2Speed] = useState(128);

  const [function1, setFunction1] = useState(false);
  const [function2, setFunction2] = useState(false);

  // Điều chỉnh tốc độ, giới hạn từ 0 đến 255
  const changeSpeed = (
    currentSpeed: number,
    setSpeed: (value: number) => void,
    amount: number,
  ) => {
    const newSpeed = Math.max(0, Math.min(255, currentSpeed + amount));
    setSpeed(newSpeed);
  };

  // Nhấn nút khẩn cấp
  const emergencyStop = () => {
    setDirection('STOP');
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
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

      {/* MOVEMENT CONTROL */}
      <View style={styles.section}>
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

      {/* MOTOR SPEED */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>MOTOR SPEED CONTROL</Text>

        <MotorSpeedControl
          motorName="MOTOR 1"
          speed={motor1Speed}
          onDecrease={() =>
            changeSpeed(motor1Speed, setMotor1Speed, -5)
          }
          onIncrease={() =>
            changeSpeed(motor1Speed, setMotor1Speed, 5)
          }
        />

        <MotorSpeedControl
          motorName="MOTOR 2"
          speed={motor2Speed}
          onDecrease={() =>
            changeSpeed(motor2Speed, setMotor2Speed, -5)
          }
          onIncrease={() =>
            changeSpeed(motor2Speed, setMotor2Speed, 5)
          }
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
        <Text style={styles.emergencyText}>EMERGENCY STOP</Text>
      </Pressable>

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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
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
    padding: 16,
    borderRadius: 14,
    marginBottom: 25,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 15,
  },
  connectionText: {
    color: '#FCA5A5',
    fontSize: 14,
  },
  directionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  directionButton: {
    width: '30%',
    height: 75,
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
    height: 75,
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
    marginTop: 15,
    padding: 14,
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
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
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
  progressBackground: {
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 10,
    marginTop: 15,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 10,
  },
  speedControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  adjustButton: {
    backgroundColor: '#334155',
    width: 42,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustText: {
    color: '#FFFFFF',
    fontSize: 24,
  },
  speedDescription: {
    color: '#94A3B8',
    fontSize: 12,
  },
  functionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  functionButton: {
    flex: 1,
    backgroundColor: '#253449',
    padding: 17,
    borderRadius: 13,
    alignItems: 'center',
  },
  functionActive: {
    backgroundColor: '#166534',
  },
  functionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  functionState: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 7,
  },
  emergencyButton: {
    backgroundColor: '#DC2626',
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  emergencyText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 1,
  },
  footer: {
    color: '#64748B',
    textAlign: 'center',
    fontSize: 10,
  },
});
