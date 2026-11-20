import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import Constants from 'expo-constants';
import { PermissionsAndroid, Platform } from 'react-native';
import {
  bluetoothConnectionReducer,
  canLoadNativeBleManager,
  getAndroidBlePermissions,
  initialBluetoothConnectionState,
  type NearbyDevice,
} from '../bluetooth';
import {
  DRIVE_BLE_NOTIFY_UUID,
  DRIVE_BLE_SERVICE_UUID,
  DRIVE_BLE_WRITE_UUID,
  DRIVE_PACKET_TYPES,
  encodeControlPacket,
  encodeLevelPacket,
  encodeMotorTestPacket,
  encodeProfilePacket,
  encodeStopPacket,
  decodeDriveFrame,
  type DriveProfile,
  type JoystickVector,
  type SpeedLevel,
  type WheelId,
} from '../drive';

const SCAN_DURATION_SECONDS = 8;
const ACK_TIMEOUT_MS = 1500;
type BleManagerModule = typeof import('react-native-ble-manager');
type SyncState = 'idle' | 'pending' | 'synced' | 'error';

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
  const connectedDeviceRef = useRef<NearbyDevice | null>(null);
  const gattReadyRef = useRef(false);
  const sequenceRef = useRef(0);
  const pendingAckRef = useRef<{
    sequence: number;
    type: number;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);
  const controlWriteInFlightRef = useRef(false);
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const lastSyncPersistRef = useRef(false);
  const [protocolReady, setProtocolReady] = useState(false);
  const [batteryVoltageMv, setBatteryVoltageMv] = useState<number | null>(null);
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);

  const nextSequence = useCallback(() => {
    sequenceRef.current = (sequenceRef.current + 1) & 0xffff;
    return sequenceRef.current;
  }, []);

  const failPendingAck = useCallback((message: string) => {
    const pending = pendingAckRef.current;
    if (pending) clearTimeout(pending.timer);
    pendingAckRef.current = null;
    setSyncState('error');
    setSyncError(message);
  }, []);

  const handleNotification = useCallback((event: {
    peripheral: string;
    service: string;
    characteristic: string;
    value: number[];
  }) => {
    if (
      event.peripheral !== connectedDeviceRef.current?.id ||
      event.service.toLowerCase() !== DRIVE_BLE_SERVICE_UUID ||
      event.characteristic.toLowerCase() !== DRIVE_BLE_NOTIFY_UUID
    ) {
      return;
    }
    const frame = decodeDriveFrame(event.value);
    if (!frame) return;
    if (frame.type === DRIVE_PACKET_TYPES.ack && frame.payload.length >= 2) {
      const pending = pendingAckRef.current;
      if (
        pending &&
        pending.sequence === frame.sequence &&
        pending.type === frame.payload[0]
      ) {
        clearTimeout(pending.timer);
        pendingAckRef.current = null;
        if (frame.payload[1] === 0) {
          setSyncState('synced');
          setSyncError(null);
        } else {
          setSyncState('error');
          setSyncError(`Xe từ chối cấu hình (mã ${frame.payload[1]}).`);
        }
      }
    } else if (frame.type === DRIVE_PACKET_TYPES.telemetry && frame.payload.length >= 2) {
      setBatteryVoltageMv(frame.payload[0] | (frame.payload[1] << 8));
    }
  }, []);

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
              if (connectedDeviceRef.current?.id === event.peripheral) {
                connectedDeviceRef.current = null;
                gattReadyRef.current = false;
                setProtocolReady(false);
                setBatteryVoltageMv(null);
                failPendingAck('Mất kết nối với xe.');
              }
              dispatch({ type: 'remoteDisconnected', peripheralId: event.peripheral });
            }),
            manager.onDidUpdateValueForCharacteristic(handleNotification),
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
  }, [failPendingAck, handleNotification]);

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
      if (pendingAckRef.current) clearTimeout(pendingAckRef.current.timer);
      pendingAckRef.current = null;
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
      let ble: BleManagerModule | null = null;
      let peripheralConnected = false;
      try {
        await requestBlePermissions();
        ble = await ensureManagerStarted();
        await ensureBluetoothIsOn(ble);
        await ble.default.connect(device.id);
        peripheralConnected = true;
        const services = await ble.default.retrieveServices(device.id, [
          DRIVE_BLE_SERVICE_UUID,
        ]);
        const hasWriteCharacteristic = services.characteristics?.some(
          (characteristic) =>
            characteristic.service.toLowerCase() === DRIVE_BLE_SERVICE_UUID &&
            characteristic.characteristic.toLowerCase() === DRIVE_BLE_WRITE_UUID,
        );
        const hasNotifyCharacteristic = services.characteristics?.some(
          (characteristic) =>
            characteristic.service.toLowerCase() === DRIVE_BLE_SERVICE_UUID &&
            characteristic.characteristic.toLowerCase() === DRIVE_BLE_NOTIFY_UUID,
        );
        if (!hasWriteCharacteristic || !hasNotifyCharacteristic) {
          throw new Error('Thiết bị không hỗ trợ dịch vụ điều khiển NQFT.');
        }
        await ble.default.startNotification(
          device.id,
          DRIVE_BLE_SERVICE_UUID,
          DRIVE_BLE_NOTIFY_UUID,
        );
        connectedDeviceRef.current = device;
        gattReadyRef.current = true;
        setProtocolReady(true);
        if (mountedRef.current) {
          dispatch({ type: 'connectSucceeded', device });
        }
      } catch (error) {
        if (peripheralConnected && ble) {
          try {
            await ble.default.disconnect(device.id);
          } catch (disconnectError) {
            console.error('Failed to disconnect unsupported BLE peripheral:', disconnectError);
          }
        }
        connectedDeviceRef.current = null;
        gattReadyRef.current = false;
        setProtocolReady(false);
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
      if (gattReadyRef.current) {
        try {
          const stopWrite = writeQueueRef.current.then(() =>
            ble.default.writeWithoutResponse(
              device.id,
              DRIVE_BLE_SERVICE_UUID,
              DRIVE_BLE_WRITE_UUID,
              encodeStopPacket(nextSequence()),
            ),
          );
          writeQueueRef.current = stopWrite.catch(() => undefined);
          await stopWrite;
        } catch (stopError) {
          console.error('Failed to send stop before BLE disconnect:', stopError);
        }
      }
      await ble.default.disconnect(device.id);
      connectedDeviceRef.current = null;
      gattReadyRef.current = false;
      setProtocolReady(false);
      setBatteryVoltageMv(null);
      failPendingAck('Đã ngắt kết nối với xe.');
      if (mountedRef.current) {
        dispatch({ type: 'disconnectSucceeded' });
      }
    } catch (error) {
      if (mountedRef.current) {
        dispatch({ type: 'disconnectFailed', error: getErrorMessage(error) });
      }
    }
  }, [ensureManagerStarted, failPendingAck, nextSequence, state.connectedDevice]);

  const writeFrame = useCallback(
    async (frame: number[], withResponse = false): Promise<void> => {
      const device = connectedDeviceRef.current;
      if (!device || !gattReadyRef.current) {
        throw new Error('Chưa kết nối với xe hỗ trợ giao thức điều khiển.');
      }
      const operation = writeQueueRef.current.then(async () => {
        if (connectedDeviceRef.current?.id !== device.id || !gattReadyRef.current) {
          throw new Error('Kết nối BLE đã thay đổi trước khi gửi lệnh.');
        }
        const ble = await ensureManagerStarted();
        if (withResponse) {
          await ble.default.write(
            device.id,
            DRIVE_BLE_SERVICE_UUID,
            DRIVE_BLE_WRITE_UUID,
            frame,
          );
        } else {
          await ble.default.writeWithoutResponse(
            device.id,
            DRIVE_BLE_SERVICE_UUID,
            DRIVE_BLE_WRITE_UUID,
            frame,
          );
        }
      });
      writeQueueRef.current = operation.catch(() => undefined);
      await operation;
    },
    [ensureManagerStarted],
  );

  const sendAckedProfile = useCallback(
    async (profile: DriveProfile, persistToNvs: boolean): Promise<void> => {
      const type = persistToNvs
        ? DRIVE_PACKET_TYPES.saveConfig
        : DRIVE_PACKET_TYPES.applyConfig;
      lastSyncPersistRef.current = persistToNvs;
      const sequence = nextSequence();
      if (pendingAckRef.current) clearTimeout(pendingAckRef.current.timer);
      const timer = setTimeout(() => {
        if (pendingAckRef.current?.sequence === sequence) {
          pendingAckRef.current = null;
          setSyncState('error');
          setSyncError('Quá thời gian chờ xác nhận từ xe. Hãy thử lại.');
        }
      }, ACK_TIMEOUT_MS);
      pendingAckRef.current = { sequence, type, timer };
      setSyncState('pending');
      setSyncError(null);
      try {
        await writeFrame(encodeProfilePacket(profile, sequence, persistToNvs), true);
      } catch (error) {
        if (pendingAckRef.current?.sequence === sequence) {
          clearTimeout(pendingAckRef.current.timer);
          pendingAckRef.current = null;
          setSyncState('error');
          setSyncError(`Không thể gửi cấu hình tới xe: ${getErrorMessage(error)}`);
        }
        throw error;
      }
    },
    [nextSequence, writeFrame],
  );

  const applyConfig = useCallback(
    (profile: DriveProfile) => sendAckedProfile(profile, false),
    [sendAckedProfile],
  );

  const saveConfigToCar = useCallback(
    (profile: DriveProfile) => sendAckedProfile(profile, true),
    [sendAckedProfile],
  );

  const retrySync = useCallback(
    (profile: DriveProfile) => sendAckedProfile(profile, lastSyncPersistRef.current),
    [sendAckedProfile],
  );

  const sendDriveControl = useCallback(
    async (joystick: JoystickVector, rotate: -1 | 0 | 1) => {
      if (!gattReadyRef.current || controlWriteInFlightRef.current) return;
      controlWriteInFlightRef.current = true;
      try {
        await writeFrame(
          encodeControlPacket(joystick, rotate, nextSequence()),
        );
      } finally {
        controlWriteInFlightRef.current = false;
      }
    },
    [nextSequence, writeFrame],
  );

  const sendStop = useCallback(async () => {
    if (!gattReadyRef.current) return;
    await writeFrame(encodeStopPacket(nextSequence()));
  }, [nextSequence, writeFrame]);

  const sendLevel = useCallback(
    async (level: SpeedLevel) => {
      if (!gattReadyRef.current) return;
      await writeFrame(encodeLevelPacket(level, nextSequence()));
    },
    [nextSequence, writeFrame],
  );

  const testMotor = useCallback(
    async (wheel: WheelId, pwm: number) => {
      if (!gattReadyRef.current) return;
      await writeFrame(
        encodeMotorTestPacket(wheel, pwm, nextSequence()),
        true,
      );
    },
    [nextSequence, writeFrame],
  );

  return {
    devices: state.devices,
    connectedDevice: state.connectedDevice,
    isScanning: state.isScanning,
    isConnecting: state.isConnecting,
    error: state.error,
    protocolReady,
    batteryVoltageMv,
    syncState,
    syncError,
    scan,
    stopScan,
    connect,
    disconnect,
    applyConfig,
    saveConfigToCar,
    retrySync,
    sendDriveControl,
    sendStop,
    sendLevel,
    testMotor,
  };
}
