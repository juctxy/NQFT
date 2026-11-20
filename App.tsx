import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ControllerScreen } from './components/ControllerScreen';
import { useBluetooth } from './context/BluetoothContext';
import { useController } from './context/ControllerContext';
import { DRIVE_CONTROL_PERIOD_MS, type JoystickVector, type SpeedLevel } from './drive';

const NEUTRAL: JoystickVector = { x: 0, y: 0 };

export default function App() {
  const router = useRouter();
  const {
    driveSettings,
    activeDriveProfile,
    driveSettingsReady,
    selectDriveProfile,
    selectSpeedLevel,
  } = useController();
  const bluetooth = useBluetooth();
  const joystickRef = useRef(NEUTRAL);
  const rotateRef = useRef<-1 | 0 | 1>(0);
  const wasMovingRef = useRef(false);
  const actionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const handleAction = useCallback((action: string) => {
    if (actionTimerRef.current) clearTimeout(actionTimerRef.current);
    setActiveAction(action);
    actionTimerRef.current = setTimeout(() => {
      setActiveAction(null);
      actionTimerRef.current = null;
    }, 300);
  }, []);

  useEffect(
    () => () => {
      if (actionTimerRef.current) clearTimeout(actionTimerRef.current);
    },
    [],
  );

  const onControlChange = useCallback((joystick: JoystickVector) => {
    joystickRef.current = joystick;
  }, []);
  const onRotateChange = useCallback((rotate: -1 | 0 | 1) => {
    rotateRef.current = rotate;
  }, []);

  const handleSelectLevel = useCallback(
    (level: SpeedLevel) => selectSpeedLevel(level),
    [selectSpeedLevel],
  );

  const handleSelectProfile = useCallback(
    (id: string) => selectDriveProfile(id),
    [selectDriveProfile],
  );

  useEffect(() => {
    if (!bluetooth.protocolReady) return;
    void bluetooth.applyConfig(activeDriveProfile).catch((error: unknown) => {
      console.error('Không thể đồng bộ cấu hình điều khiển:', error);
    });
  }, [activeDriveProfile, bluetooth.applyConfig, bluetooth.protocolReady]);

  useEffect(() => {
    if (!bluetooth.protocolReady) return;
    void bluetooth.sendLevel(driveSettings.activeLevel).catch((error: unknown) => {
      console.error('Không thể gửi mức tốc độ tới xe:', error);
    });
  }, [
    bluetooth.protocolReady,
    bluetooth.sendLevel,
    driveSettings.activeLevel,
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      const joystick = joystickRef.current;
      const rotate = rotateRef.current;
      const moving = joystick.x !== 0 || joystick.y !== 0 || rotate !== 0;
      if (moving) {
        wasMovingRef.current = true;
        void bluetooth.sendDriveControl(joystick, rotate).catch((error: unknown) => {
          console.error('Không thể gửi lệnh điều khiển:', error);
          joystickRef.current = NEUTRAL;
          rotateRef.current = 0;
          wasMovingRef.current = false;
          void bluetooth.sendStop().catch((stopError: unknown) => {
            console.error('Không thể dừng xe sau lỗi điều khiển:', stopError);
          });
        });
      } else if (wasMovingRef.current) {
        wasMovingRef.current = false;
        void bluetooth.sendStop().catch((error: unknown) => {
          console.error('Không thể gửi lệnh dừng:', error);
        });
      }
    }, DRIVE_CONTROL_PERIOD_MS);

    return () => {
      clearInterval(timer);
      joystickRef.current = NEUTRAL;
      rotateRef.current = 0;
      wasMovingRef.current = false;
      void bluetooth.sendStop().catch((error: unknown) => {
        console.error('Không thể dừng xe khi rời màn hình điều khiển:', error);
      });
    };
  }, [bluetooth.sendDriveControl, bluetooth.sendStop]);

  const handleOpenSettings = useCallback(() => {
    joystickRef.current = NEUTRAL;
    rotateRef.current = 0;
    wasMovingRef.current = false;
    void bluetooth.sendStop().catch((error: unknown) => {
      console.error('Không thể gửi lệnh dừng:', error);
    });
    router.push('/settings');
  }, [bluetooth.sendStop, router]);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom', 'left', 'right']}>
      <ControllerScreen
        driveProfile={activeDriveProfile}
        driveProfiles={driveSettings.profiles}
        activeLevel={driveSettings.activeLevel}
        driveSettingsReady={driveSettingsReady}
        bluetoothDevices={bluetooth.devices}
        connectedDevice={bluetooth.connectedDevice}
        bluetoothIsScanning={bluetooth.isScanning}
        bluetoothIsConnecting={bluetooth.isConnecting}
        bluetoothError={bluetooth.error}
        actionLabel={activeAction ?? 'Sẵn sàng'}
        onSelectSpeedLevel={handleSelectLevel}
        onSelectProfile={handleSelectProfile}
        onControlChange={onControlChange}
        onRotateChange={onRotateChange}
        onAction={handleAction}
        onBluetoothScan={bluetooth.scan}
        onBluetoothStopScan={bluetooth.stopScan}
        onBluetoothConnect={bluetooth.connect}
        onBluetoothDisconnect={bluetooth.disconnect}
        onOpenInstructions={() => router.push('/instructions')}
        onOpenSettings={handleOpenSettings}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#f1f5f9',
    flex: 1,
  },
});
