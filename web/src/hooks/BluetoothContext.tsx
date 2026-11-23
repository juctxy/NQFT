// Trạng thái Bluetooth cho giao diện (danh sách thiết bị, đang quét, đang kết nối…),
// theo cùng mô hình với BluetoothProvider của NQFT, nhưng chạy trên BleTransport của app này.
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ControlLoop } from '../control/ControlLoop';
import type { CarConfig } from '../protocol/packet';
import { useCar } from './useCar';

export interface NearbyDevice {
  id: string;
  name: string | null;
}

export interface BluetoothValue {
  devices: NearbyDevice[];
  connectedDevice: NearbyDevice | null;
  isScanning: boolean;
  isConnecting: boolean;
  error: string | null;
  /** mV, null = chưa có (hoặc xe chưa có cảm biến pin). */
  batteryVoltageMv: number | null;
  scan: () => void;
  stopScan: () => void;
  connect: (d: NearbyDevice) => Promise<void>;
  disconnect: () => void;
  controlLoop: ControlLoop;
  /** Đổi mỗi khi trạng thái kết nối đổi — dùng để gửi lại lệnh sau khi kết nối lại. */
  connectionKey: string;
  /** Ô CONFIG đọc từ xe lúc kết nối / sau khi lưu; null = chưa đọc được. */
  carConfig: CarConfig | null;
  /** Xe có ô CONFIG (lưu cấu hình) / ô TEST (chạy thử từng bánh) không. */
  configSupported: boolean;
  testSupported: boolean;
  /** Ghi CONFIG xuống xe rồi đọc lại; trả cấu hình xe đang dùng. */
  saveConfig: (config: CarConfig) => Promise<CarConfig | null>;
  /** Chạy thử 1 bánh: wheel 0..3 = FL, FR, BL, BR; null = dừng. */
  sendTest: (wheel: number | null, speed: number) => boolean;
}

export function nearbyDeviceName(d: NearbyDevice): string {
  return d.name?.trim() || 'Unnamed BLE device';
}

const Ctx = createContext<BluetoothValue | null>(null);

export function BluetoothProvider({ children }: { children: ReactNode }) {
  const car = useCar();
  const [devices, setDevices] = useState<NearbyDevice[]>([]);
  const [isScanning, setScanning] = useState(false);
  const scanId = useRef(0);
  const lastDevice = useRef<NearbyDevice | null>(null);

  const scan = useCallback(() => {
    if (isScanning) return;
    const id = ++scanId.current;
    setDevices([]);
    setScanning(true);
    // Gọi ngay trong thao tác bấm (yêu cầu của Web Bluetooth).
    car.requestDevice().then((d) => {
      if (id !== scanId.current) return;
      setScanning(false);
      if (d) {
        lastDevice.current = d;
        setDevices([d]);
      }
    });
  }, [car, isScanning]);

  const stopScan = useCallback(() => {
    scanId.current += 1;
    setScanning(false);
  }, []);

  const connect = useCallback(
    async (d: NearbyDevice) => {
      lastDevice.current = d;
      await car.connectSelected();
    },
    [car],
  );

  const { state, deviceName, error } = car.status;
  const connectedDevice = useMemo<NearbyDevice | null>(
    () => (state === 'connected' ? { id: lastDevice.current?.id ?? 'car', name: deviceName } : null),
    [state, deviceName],
  );
  const battery = car.telemetry && car.telemetry.batteryMv > 0 ? car.telemetry.batteryMv : null;

  const value = useMemo<BluetoothValue>(
    () => ({
      devices,
      connectedDevice,
      isScanning,
      isConnecting: state === 'connecting' || state === 'reconnecting',
      error,
      batteryVoltageMv: battery,
      scan,
      stopScan,
      connect,
      disconnect: car.disconnect,
      controlLoop: car.controlLoop,
      connectionKey: state,
      carConfig: car.carConfig,
      configSupported: car.configSupported,
      testSupported: car.testSupported,
      saveConfig: car.saveConfig,
      sendTest: car.sendTest,
    }),
    [
      devices, connectedDevice, isScanning, state, error, battery, scan, stopScan, connect,
      car.disconnect, car.controlLoop, car.carConfig, car.configSupported, car.testSupported,
      car.saveConfig, car.sendTest,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBluetooth(): BluetoothValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useBluetooth must be used within BluetoothProvider');
  return v;
}
