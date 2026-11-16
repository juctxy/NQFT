import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ControllerScreen } from './components/ControllerScreen';
import { useController } from './context/ControllerContext';
import type { CommandType } from './controller';
import { useBluetoothConnection } from './hooks/useBluetoothConnection';

export default function App() {
  const router = useRouter();
  const {
    motor1Speed,
    motor2Speed,
    presets,
    setMotor1Speed,
    setMotor2Speed,
    applyPreset,
  } = useController();
  const bluetooth = useBluetoothConnection();
  const [command, setCommand] = useState<CommandType>('STOP');
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const actionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (actionTimer.current) clearTimeout(actionTimer.current);
    },
    [],
  );

  const handleCommandChange = useCallback((nextCommand: CommandType) => {
    setCommand(nextCommand);
  }, []);

  const handleAction = useCallback((action: string) => {
    if (actionTimer.current) clearTimeout(actionTimer.current);
    setActiveAction(action);
    actionTimer.current = setTimeout(() => {
      setActiveAction(null);
      actionTimer.current = null;
    }, 300);
  }, []);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom', 'left', 'right']}>
      <ControllerScreen
        motor1Speed={motor1Speed}
        motor2Speed={motor2Speed}
        presets={presets}
        command={activeAction ?? command}
        bluetoothDevices={bluetooth.devices}
        connectedDevice={bluetooth.connectedDevice}
        bluetoothIsScanning={bluetooth.isScanning}
        bluetoothIsConnecting={bluetooth.isConnecting}
        bluetoothError={bluetooth.error}
        onMotor1SpeedChange={setMotor1Speed}
        onMotor2SpeedChange={setMotor2Speed}
        onApplyPreset={applyPreset}
        onCommandChange={handleCommandChange}
        onAction={handleAction}
        onBluetoothScan={bluetooth.scan}
        onBluetoothStopScan={bluetooth.stopScan}
        onBluetoothConnect={bluetooth.connect}
        onBluetoothDisconnect={bluetooth.disconnect}
        onOpenInstructions={() => router.push('/instructions')}
        onOpenSettings={() => router.push('/settings')}
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
