import { useCallback, useEffect, useReducer, useRef } from 'react';
import Constants from 'expo-constants';
import { PermissionsAndroid, Platform } from 'react-native';
import {
  bluetoothConnectionReducer,
  canLoadNativeBleManager,
  getAndroidBlePermissions,
  initialBluetoothConnectionState,
  type NearbyDevice,
} from '../bluetooth';

const SCAN_DURATION_SECONDS = 8;
type BleManagerModule = typeof import('react-native-ble-manager');

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function requestBlePermissions(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  const permissions = getAndroidBlePermissions(Number(Platform.Version));
  if (permissions.length === 0) {
    return;
  }

  const results = await PermissionsAndroid.requestMultiple(permissions);
  const denied = permissions.filter(
    (permission) => results[permission] !== PermissionsAndroid.RESULTS.GRANTED,
  );
  if (denied.length > 0) {
    const blocked = denied.some(
      (permission) => results[permission] === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN,
    );
    if (blocked) {
      throw new Error('Bluetooth permission is blocked. Allow it in the app settings.');
    }
    throw new Error('Bluetooth permission is required to scan for and connect to devices.');
  }
}

async function ensureBluetoothIsOn(ble: BleManagerModule): Promise<void> {
  const state = await ble.default.checkState();
  if (state === ble.BleState.On) {
    return;
  }

  if (state === ble.BleState.Unsupported) {
    throw new Error('Bluetooth LE is not supported on this device.');
  }

  if (state === ble.BleState.Unauthorized) {
    throw new Error('Bluetooth access is not authorized. Allow Bluetooth access in Settings.');
  }

  if (state === ble.BleState.Off) {
    throw new Error('Turn on Bluetooth to scan for the robot.');
  }

  throw new Error(`Bluetooth is not ready (${state}).`);
}

export function useBluetoothConnection() {
  const [state, dispatch] = useReducer(
    bluetoothConnectionReducer,
    initialBluetoothConnectionState,
  );
  const mountedRef = useRef(false);
  const scanActiveRef = useRef(false);
  const managerStartRef = useRef<Promise<BleManagerModule> | null>(null);
  const subscriptionsRef = useRef<{ remove: () => void }[]>([]);

  const ensureManagerStarted = useCallback((): Promise<BleManagerModule> => {
    if (!managerStartRef.current) {
      managerStartRef.current = (async () => {
        // SDK 58's executionEnvironment groups Expo Go and expo-dev-client together.
        if (!canLoadNativeBleManager(Platform.OS, Constants.appOwnership)) {
          throw new Error(
            Platform.OS === 'web'
              ? 'BLE scanning is available only in the iOS and Android apps.'
              : 'Bluetooth requires a development build; Expo Go does not include the native BLE module.',
          );
        }

        const ble = await import('react-native-ble-manager');
        if (mountedRef.current && subscriptionsRef.current.length === 0) {
          const { default: manager } = ble;
          subscriptionsRef.current = [
            manager.onDiscoverPeripheral((peripheral) => {
              if (!mountedRef.current) {
                return;
              }
              dispatch({
                type: 'deviceDiscovered',
                device: {
                  id: peripheral.id,
                  name: peripheral.name ?? peripheral.advertising.localName,
                  rssi: peripheral.rssi,
                },
              });
            }),
            manager.onStopScan(() => {
              if (!mountedRef.current) {
                return;
              }
              scanActiveRef.current = false;
              dispatch({ type: 'scanStopped' });
            }),
            manager.onDisconnectPeripheral((event) => {
              if (!mountedRef.current) {
                return;
              }
              dispatch({ type: 'remoteDisconnected', peripheralId: event.peripheral });
            }),
          ];
        }
        await ble.default.start({ showAlert: false });
        return ble;
      })().catch((error: unknown) => {
        managerStartRef.current = null;
        const message = getErrorMessage(error);
        if (message.includes('BleManagerModule not found')) {
          throw new Error(
            'BLE is unavailable in Expo Go. Install a development build to scan devices.',
          );
        }
        throw error;
      });
    }

    return managerStartRef.current;
  }, []);

  const stopScan = useCallback(async (): Promise<void> => {
    if (!scanActiveRef.current) {
      return;
    }

    scanActiveRef.current = false;
    try {
      const ble = await ensureManagerStarted();
      await ble.default.stopScan();
      if (mountedRef.current) {
        dispatch({ type: 'scanStopped' });
      }
    } catch (error) {
      if (mountedRef.current) {
        dispatch({ type: 'scanFailed', error: getErrorMessage(error) });
      }
    }
  }, [ensureManagerStarted]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (scanActiveRef.current) {
        scanActiveRef.current = false;
        const managerStart = managerStartRef.current;
        if (managerStart) {
          void managerStart
            .then(({ default: manager }) => manager.stopScan())
            .catch((error: unknown) => {
              console.error('Failed to stop BLE scan during cleanup:', error);
            });
        }
      }
      subscriptionsRef.current.forEach((subscription) => subscription.remove());
      subscriptionsRef.current = [];
    };
  }, []);

  const scan = useCallback(async (): Promise<void> => {
    if (scanActiveRef.current) {
      return;
    }

    try {
      await requestBlePermissions();
      const ble = await ensureManagerStarted();
      await ensureBluetoothIsOn(ble);
      if (!mountedRef.current) {
        return;
      }
      dispatch({ type: 'scanStarted' });
      scanActiveRef.current = true;
      await ble.default.scan({ seconds: SCAN_DURATION_SECONDS, allowDuplicates: true });
    } catch (error) {
      scanActiveRef.current = false;
      if (mountedRef.current) {
        dispatch({ type: 'scanFailed', error: getErrorMessage(error) });
      }
    }
  }, [ensureManagerStarted]);

  const connect = useCallback(
    async (device: NearbyDevice): Promise<void> => {
      if (scanActiveRef.current) {
        await stopScan();
      }

      dispatch({ type: 'connectStarted' });
      try {
        await requestBlePermissions();
        const ble = await ensureManagerStarted();
        await ensureBluetoothIsOn(ble);
        await ble.default.connect(device.id);
        if (mountedRef.current) {
          dispatch({ type: 'connectSucceeded', device });
        }
      } catch (error) {
        if (mountedRef.current) {
          dispatch({ type: 'connectFailed', error: getErrorMessage(error) });
        }
      }
    },
    [ensureManagerStarted, stopScan],
  );

  const disconnect = useCallback(async (): Promise<void> => {
    const device = state.connectedDevice;
    if (!device) {
      return;
    }

    try {
      const ble = await ensureManagerStarted();
      await ble.default.disconnect(device.id);
      if (mountedRef.current) {
        dispatch({ type: 'disconnectSucceeded' });
      }
    } catch (error) {
      if (mountedRef.current) {
        dispatch({ type: 'disconnectFailed', error: getErrorMessage(error) });
      }
    }
  }, [ensureManagerStarted, state.connectedDevice]);

  return {
    devices: state.devices,
    connectedDevice: state.connectedDevice,
    isScanning: state.isScanning,
    isConnecting: state.isConnecting,
    error: state.error,
    scan,
    stopScan,
    connect,
    disconnect,
  };
}
