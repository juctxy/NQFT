import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ControllerProvider } from '../context/ControllerContext';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ControllerProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false, orientation: 'landscape' }} />
        </ControllerProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
