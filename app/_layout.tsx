import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ControllerProvider } from '../context/ControllerContext';
import { BluetoothProvider } from '../context/BluetoothContext';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ControllerProvider>
          <BluetoothProvider>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false, orientation: 'landscape' }} />
          </BluetoothProvider>
        </ControllerProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
