import assert from 'node:assert/strict';
import test from 'node:test';
import {
  bluetoothConnectionReducer,
  canLoadNativeBleManager,
  getAndroidBlePermissions,
  initialBluetoothConnectionState,
  mergeNearbyDevice,
  nearbyDeviceName,
} from './bluetooth.ts';

test('merges repeated BLE discoveries by ID and updates signal data', () => {
  const first = { id: 'esp32', name: 'Robot', rssi: -60 };
  const updated = { id: 'esp32', name: 'Robot', rssi: -42 };

  assert.deepEqual(mergeNearbyDevice([first], updated), [updated]);
});

test('preserves a previously discovered name when a later advertisement omits it', () => {
  const first = { id: 'esp32', name: 'Robot', rssi: -60 };
  const updated = { id: 'esp32', rssi: -42 };

  assert.deepEqual(mergeNearbyDevice([first], updated), [
    { id: 'esp32', name: 'Robot', rssi: -42 },
  ]);
});

test('uses a stable label for peripherals with no advertised name', () => {
  assert.equal(nearbyDeviceName({ id: 'esp32', rssi: -60 }), 'Unnamed BLE device');
  assert.equal(nearbyDeviceName({ id: 'esp32', name: '  ', rssi: -60 }), 'Unnamed BLE device');
});

test('requests legacy location permission on Android API 30 and BLE permissions on API 31+', () => {
  assert.deepEqual(getAndroidBlePermissions(30), [
    'android.permission.ACCESS_FINE_LOCATION',
  ]);
  assert.deepEqual(getAndroidBlePermissions(31), [
    'android.permission.BLUETOOTH_SCAN',
    'android.permission.BLUETOOTH_CONNECT',
  ]);
});

test('does not load the native BLE manager in Expo Go or on web', () => {
  assert.equal(canLoadNativeBleManager('ios', 'expo'), false);
  assert.equal(canLoadNativeBleManager('web', null), false);
});

test('loads the native BLE manager in a custom iOS build', () => {
  assert.equal(canLoadNativeBleManager('ios', null), true);
});

test('starting a scan clears stale discoveries', () => {
  const device = { id: 'esp32', name: 'Robot', rssi: -60 };
  const state = {
    ...initialBluetoothConnectionState,
    devices: [device],
  };

  const next = bluetoothConnectionReducer(state, { type: 'scanStarted' });

  assert.deepEqual(next.devices, []);
  assert.equal(next.isScanning, true);
});

test('connection failure clears the pending state without marking a device connected', () => {
  const next = bluetoothConnectionReducer(
    { ...initialBluetoothConnectionState, isConnecting: true },
    { type: 'connectFailed', error: 'Could not connect' },
  );

  assert.equal(next.connectedDevice, null);
  assert.equal(next.isConnecting, false);
  assert.equal(next.error, 'Could not connect');
});

test('remote disconnect clears only the matching connected peripheral', () => {
  const device = { id: 'esp32', name: 'Robot', rssi: -60 };
  const connected = bluetoothConnectionReducer(initialBluetoothConnectionState, {
    type: 'connectSucceeded',
    device,
  });

  const unrelated = bluetoothConnectionReducer(connected, {
    type: 'remoteDisconnected',
    peripheralId: 'other',
  });
  const disconnected = bluetoothConnectionReducer(connected, {
    type: 'remoteDisconnected',
    peripheralId: device.id,
  });

  assert.equal(unrelated.connectedDevice, device);
  assert.equal(disconnected.connectedDevice, null);
});
