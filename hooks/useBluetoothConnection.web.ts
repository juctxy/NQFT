import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  bluetoothConnectionReducer,
  getWebBluetoothRequestError,
  initialBluetoothConnectionState,
  type NearbyDevice,
} from '../bluetooth';
import {
  DRIVE_PACKET_TYPES,
  decodeDriveFrame,
  encodeControlPacket,
  encodeLevelPacket,
  encodeMotorTestPacket,
  encodeProfilePacket,
  encodeStopPacket,
  type DriveProfile,
  type JoystickVector,
  type SpeedLevel,
  type WheelId,
} from '../drive';
import type { useBluetoothConnection as useNativeBluetoothConnection } from './useBluetoothConnection';
import { WebBluetoothTransport } from './webBluetoothTransport';

type BluetoothConnectionResult = ReturnType<typeof useNativeBluetoothConnection>;

const ACK_TIMEOUT_MS = 1500;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function useBluetoothConnection(): BluetoothConnectionResult {
  const [state, dispatch] = useReducer(
    bluetoothConnectionReducer,
    initialBluetoothConnectionState,
  );
  const transportRef = useRef<WebBluetoothTransport | null>(null);
  if (!transportRef.current) {
    transportRef.current = new WebBluetoothTransport();
  }
  const transport = transportRef.current;
  const mountedRef = useRef(false);
  const scanActiveRef = useRef(false);
  const scanGenerationRef = useRef(0);
  const devicesRef = useRef(new Map<string, Parameters<
    WebBluetoothTransport['connect']
  >[0]>());
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
  const [syncState, setSyncState] = useState<BluetoothConnectionResult['syncState']>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);

  const nextSequence = useCallback(() => {
    sequenceRef.current = (sequenceRef.current + 1) & 0xffff;
    return sequenceRef.current;
  }, []);

  const failPendingAck = useCallback((message: string) => {
    const pending = pendingAckRef.current;
    if (pending) clearTimeout(pending.timer);
    pendingAckRef.current = null;
    if (mountedRef.current) {
      setSyncState('error');
      setSyncError(message);
    }
  }, []);

  const handleNotification = useCallback((bytes: number[]) => {
    if (!connectedDeviceRef.current) return;
    const frame = decodeDriveFrame(bytes);
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

  useEffect(() => {
    mountedRef.current = true;
    const removeNotificationListener = transport.onNotification(handleNotification);
    const removeDisconnectListener = transport.onDisconnect(() => {
      const device = connectedDeviceRef.current;
      if (!device) return;

      connectedDeviceRef.current = null;
      gattReadyRef.current = false;
      setProtocolReady(false);
      setBatteryVoltageMv(null);
      failPendingAck('Mất kết nối với xe.');
      dispatch({ type: 'remoteDisconnected', peripheralId: device.id });
    });

    return () => {
      mountedRef.current = false;
      scanGenerationRef.current += 1;
      scanActiveRef.current = false;
      removeNotificationListener();
      removeDisconnectListener();
      if (pendingAckRef.current) clearTimeout(pendingAckRef.current.timer);
      pendingAckRef.current = null;

      if (gattReadyRef.current) {
        void transport
          .write(encodeStopPacket(nextSequence()), false)
          .catch((error: unknown) => {
            console.error('Failed to send stop before closing the BLE page:', error);
          })
          .finally(() => transport.dispose());
      } else {
        transport.dispose();
      }
    };
  }, [failPendingAck, handleNotification, nextSequence, transport]);

  const scan = useCallback(async (): Promise<void> => {
    if (scanActiveRef.current) return;

    const generation = scanGenerationRef.current + 1;
    scanGenerationRef.current = generation;
    scanActiveRef.current = true;
    devicesRef.current.clear();
    dispatch({ type: 'scanStarted' });

    try {
      if (typeof window === 'undefined' || !window.isSecureContext) {
        throw new Error('Bluetooth requires a secure HTTPS connection.');
      }

      const devicePromise = transport.requestDevice();
      const device = await devicePromise;
      if (!mountedRef.current || generation !== scanGenerationRef.current) return;

      const nearbyDevice: NearbyDevice = {
        id: device.id,
        name: device.name ?? undefined,
      };
      devicesRef.current.set(device.id, device);
      dispatch({ type: 'deviceDiscovered', device: nearbyDevice });
      dispatch({ type: 'scanStopped' });
      scanActiveRef.current = false;
    } catch (error) {
      if (!mountedRef.current || generation !== scanGenerationRef.current) return;

      scanActiveRef.current = false;
      const message = getWebBluetoothRequestError(error);
      if (message) {
        dispatch({ type: 'scanFailed', error: message });
      } else {
        dispatch({ type: 'scanStopped' });
      }
    }
  }, [transport]);

  const stopScan = useCallback(async (): Promise<void> => {
    if (!scanActiveRef.current) return;

    scanGenerationRef.current += 1;
    scanActiveRef.current = false;
    dispatch({ type: 'scanStopped' });
  }, []);

  const connect = useCallback(
    async (nearbyDevice: NearbyDevice): Promise<void> => {
      const device = devicesRef.current.get(nearbyDevice.id);
      if (!device) {
        dispatch({
          type: 'connectFailed',
          error: 'Thiết bị đã hết hạn. Hãy mở lại danh sách Bluetooth và chọn xe.',
        });
        return;
      }

      dispatch({ type: 'connectStarted' });
      try {
        await transport.connect(device);
        connectedDeviceRef.current = nearbyDevice;
        gattReadyRef.current = true;
        setProtocolReady(true);
        dispatch({ type: 'connectSucceeded', device: nearbyDevice });
      } catch (error) {
        connectedDeviceRef.current = null;
        gattReadyRef.current = false;
        setProtocolReady(false);
        dispatch({
          type: 'connectFailed',
          error: `Không thể kết nối BLE: ${getErrorMessage(error)}`,
        });
      }
    },
    [transport],
  );

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
        await transport.write(frame, withResponse);
      });
      writeQueueRef.current = operation.catch(() => undefined);
      await operation;
    },
    [transport],
  );

  const disconnect = useCallback(async (): Promise<void> => {
    const device = connectedDeviceRef.current;
    if (!device) return;

    try {
      if (gattReadyRef.current) {
        try {
          await writeFrame(encodeStopPacket(nextSequence()));
        } catch (stopError) {
          console.error('Failed to send stop before BLE disconnect:', stopError);
        }
      }

      transport.disconnect();
      connectedDeviceRef.current = null;
      gattReadyRef.current = false;
      setProtocolReady(false);
      setBatteryVoltageMv(null);
      failPendingAck('Đã ngắt kết nối với xe.');
      dispatch({ type: 'disconnectSucceeded' });
    } catch (error) {
      dispatch({ type: 'disconnectFailed', error: getErrorMessage(error) });
      throw error;
    }
  }, [failPendingAck, nextSequence, transport, writeFrame]);

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
    async (joystick: JoystickVector, rotate: -1 | 0 | 1): Promise<void> => {
      if (!gattReadyRef.current || controlWriteInFlightRef.current) return;
      controlWriteInFlightRef.current = true;
      try {
        await writeFrame(encodeControlPacket(joystick, rotate, nextSequence()));
      } finally {
        controlWriteInFlightRef.current = false;
      }
    },
    [nextSequence, writeFrame],
  );

  const sendStop = useCallback(async (): Promise<void> => {
    if (!gattReadyRef.current) return;
    await writeFrame(encodeStopPacket(nextSequence()));
  }, [nextSequence, writeFrame]);

  const sendLevel = useCallback(
    async (level: SpeedLevel): Promise<void> => {
      if (!gattReadyRef.current) return;
      await writeFrame(encodeLevelPacket(level, nextSequence()));
    },
    [nextSequence, writeFrame],
  );

  const testMotor = useCallback(
    async (wheel: WheelId, pwm: number): Promise<void> => {
      if (!gattReadyRef.current) return;
      await writeFrame(encodeMotorTestPacket(wheel, pwm, nextSequence()), true);
    },
    [nextSequence, writeFrame],
  );

  useEffect(() => {
    const stopWhenHidden = () => {
      if (document.visibilityState === 'hidden') {
        void sendStop().catch((error: unknown) => {
          console.error('Failed to stop the robot when the PWA is hidden:', error);
        });
      }
    };

    document.addEventListener('visibilitychange', stopWhenHidden);
    window.addEventListener('pagehide', stopWhenHidden);
    return () => {
      document.removeEventListener('visibilitychange', stopWhenHidden);
      window.removeEventListener('pagehide', stopWhenHidden);
    };
  }, [sendStop]);

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
