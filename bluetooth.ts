import type { Permission } from 'react-native';

export interface NearbyDevice {
  id: string;
  name?: string;
  rssi?: number;
}

export function canLoadNativeBleManager(platform: string, appOwnership: string | null): boolean {
  return platform !== 'web' && appOwnership !== 'expo';
}

export interface BluetoothConnectionState {
  devices: NearbyDevice[];
  connectedDevice: NearbyDevice | null;
  isScanning: boolean;
  isConnecting: boolean;
  error: string | null;
}

export type BluetoothAction =
  | { type: 'scanStarted' }
  | { type: 'scanStopped' }
  | { type: 'scanFailed'; error: string }
  | { type: 'deviceDiscovered'; device: NearbyDevice }
  | { type: 'connectStarted' }
  | { type: 'connectSucceeded'; device: NearbyDevice }
  | { type: 'connectFailed'; error: string }
  | { type: 'disconnectSucceeded' }
  | { type: 'disconnectFailed'; error: string }
  | { type: 'remoteDisconnected'; peripheralId: string }
  | { type: 'error'; error: string };

export const initialBluetoothConnectionState: BluetoothConnectionState = {
  devices: [],
  connectedDevice: null,
  isScanning: false,
  isConnecting: false,
  error: null,
};

export function bluetoothConnectionReducer(
  state: BluetoothConnectionState,
  action: BluetoothAction,
): BluetoothConnectionState {
  switch (action.type) {
    case 'scanStarted':
      return { ...state, devices: [], isScanning: true, error: null };
    case 'scanStopped':
      return { ...state, isScanning: false };
    case 'scanFailed':
      return { ...state, isScanning: false, error: action.error };
    case 'deviceDiscovered':
      return { ...state, devices: mergeNearbyDevice(state.devices, action.device) };
    case 'connectStarted':
      return { ...state, isConnecting: true, error: null };
    case 'connectSucceeded':
      return {
        ...state,
        connectedDevice: action.device,
        isConnecting: false,
        error: null,
      };
    case 'connectFailed':
      return { ...state, connectedDevice: null, isConnecting: false, error: action.error };
    case 'disconnectSucceeded':
      return { ...state, connectedDevice: null, error: null };
    case 'disconnectFailed':
    case 'error':
      return { ...state, error: action.error };
    case 'remoteDisconnected':
      return state.connectedDevice?.id === action.peripheralId
        ? { ...state, connectedDevice: null }
        : state;
  }
}

export function mergeNearbyDevice(
  devices: NearbyDevice[],
  incoming: NearbyDevice,
): NearbyDevice[] {
  const index = devices.findIndex((device) => device.id === incoming.id);

  if (index === -1) {
    return [...devices, incoming];
  }

  const existing = devices[index];
  const name = incoming.name?.trim() ? incoming.name : existing.name;

  return devices.map((device, deviceIndex) =>
    deviceIndex === index ? { ...existing, ...incoming, name } : device,
  );
}

export function nearbyDeviceName(device: NearbyDevice): string {
  return device.name?.trim() || 'Unnamed BLE device';
}

export function getWebBluetoothRequestError(error: unknown): string | null {
  const name = error instanceof Error ? error.name : '';
  const message = error instanceof Error ? error.message : String(error);
  const normalizedMessage = message.toLowerCase();

  if (
    name === 'NotFoundError' ||
    name === 'AbortError' ||
    normalizedMessage.includes('cancelled') ||
    normalizedMessage.includes('canceled')
  ) {
    return null;
  }

  if (name === 'SecurityError' || name === 'NotAllowedError') {
    return 'Web Bluetooth requires HTTPS and permission to access nearby Bluetooth devices.';
  }

  return `Could not open the Bluetooth device chooser: ${message}`;
}

export function getAndroidBlePermissions(version: number): Permission[] {
  if (version >= 31) {
    return [
      'android.permission.BLUETOOTH_SCAN',
      'android.permission.BLUETOOTH_CONNECT',
    ];
  }

  if (version >= 23) {
    return ['android.permission.ACCESS_FINE_LOCATION'];
  }

  return [];
}
