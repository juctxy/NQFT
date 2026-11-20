import assert from 'node:assert/strict';
import test from 'node:test';
import {
  bluetoothConnectionReducer,
  canLoadNativeBleManager,
  getWebBluetoothRequestError,
  getAndroidBlePermissions,
  initialBluetoothConnectionState,
  mergeNearbyDevice,
  nearbyDeviceName,
} from './bluetooth.ts';
import { WebBluetoothTransport } from './hooks/webBluetoothTransport.ts';

class FakeCharacteristic extends EventTarget {
  value;
  notificationsStarted = false;
  writesWithResponse = [];
  writesWithoutResponse = [];

  async startNotifications() {
    this.notificationsStarted = true;
    return this;
  }

  async writeValue(packet) {
    this.writesWithResponse.push(Array.from(packet));
  }

  async writeValueWithResponse(packet) {
    this.writesWithResponse.push(Array.from(packet));
  }

  async writeValueWithoutResponse(packet) {
    this.writesWithoutResponse.push(Array.from(packet));
  }
}

function createFakeDevice({ missingCharacteristic } = {}) {
  const writeCharacteristic = new FakeCharacteristic();
  const notifyCharacteristic = new FakeCharacteristic();
  let device;
  const service = {
    async getCharacteristic(uuid) {
      if (uuid === '4e514654-0001-4e51-4654-000000000002') {
        return writeCharacteristic;
      }
      if (!missingCharacteristic && uuid === '4e514654-0001-4e51-4654-000000000003') {
        return notifyCharacteristic;
      }
      throw new Error('Characteristic not found');
    },
  };
  const server = {
    connected: false,
    async connect() {
      this.connected = true;
      return this;
    },
    async getPrimaryService(uuid) {
      assert.equal(uuid, '4e514654-0001-4e51-4654-000000000001');
      return service;
    },
  };
  const gatt = {
    async connect() {
      return server.connect();
    },
    disconnect() {
      server.connected = false;
      device.dispatchEvent(new Event('gattserverdisconnected'));
    },
  };
  device = new EventTarget();
  device.id = 'esp32';
  device.name = 'NQFT Robot';
  device.gatt = gatt;
  return { device, notifyCharacteristic, writeCharacteristic, server };
}

test('requests only devices advertising the NQFT drive service', async () => {
  const { device } = createFakeDevice();
  let requestedOptions;
  const transport = new WebBluetoothTransport({
    async requestDevice(options) {
      requestedOptions = options;
      return device;
    },
  });

  assert.equal(await transport.requestDevice(), device);
  assert.deepEqual(requestedOptions, {
    filters: [{ services: ['4e514654-0001-4e51-4654-000000000001'] }],
    optionalServices: ['4e514654-0001-4e51-4654-000000000001'],
  });
});

test('connects GATT notifications and prefers write-without-response for control frames', async () => {
  const { device, notifyCharacteristic, writeCharacteristic } = createFakeDevice();
  const transport = new WebBluetoothTransport({ requestDevice: async () => device });
  let notification;

  await transport.connect(device);
  const removeListener = transport.onNotification((bytes) => {
    notification = bytes;
  });
  await transport.write([0xa5, 0x5a], false);

  const frame = new Uint8Array([0x81, 0x01]);
  notifyCharacteristic.value = new DataView(frame.buffer);
  notifyCharacteristic.dispatchEvent(new Event('characteristicvaluechanged'));

  assert.equal(notifyCharacteristic.notificationsStarted, true);
  assert.deepEqual(writeCharacteristic.writesWithoutResponse, [[0xa5, 0x5a]]);
  assert.deepEqual(notification, [0x81, 0x01]);
  removeListener();
  transport.disconnect();
});

test('rejects writes after disconnecting and reports a missing protocol characteristic', async () => {
  const first = createFakeDevice();
  const transport = new WebBluetoothTransport({ requestDevice: async () => first.device });
  await transport.connect(first.device);
  transport.disconnect();
  await assert.rejects(transport.write([0xa5], false), /not connected/i);

  const unsupported = createFakeDevice({ missingCharacteristic: true });
  const unsupportedTransport = new WebBluetoothTransport({
    requestDevice: async () => unsupported.device,
  });
  await assert.rejects(unsupportedTransport.connect(unsupported.device), /characteristic/i);
  assert.equal(unsupported.server.connected, false);
});

test('treats a cancelled device chooser as a non-error and reports other failures', () => {
  const cancelled = new Error('The requestDevice chooser was cancelled');
  cancelled.name = 'NotFoundError';
  assert.equal(getWebBluetoothRequestError(cancelled), null);

  const denied = new Error('Bluetooth permission denied');
  denied.name = 'SecurityError';
  assert.match(getWebBluetoothRequestError(denied), /HTTPS|secure/i);
});

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
