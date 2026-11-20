import {
  DRIVE_BLE_SERVICE_UUID,
  DRIVE_BLE_NOTIFY_UUID,
  DRIVE_BLE_WRITE_UUID,
} from '../drive.ts';

export interface BrowserBluetoothCharacteristic extends EventTarget {
  value?: DataView | null;
  startNotifications(): Promise<BrowserBluetoothCharacteristic>;
  writeValue(value: Uint8Array): Promise<void>;
  writeValueWithResponse?(value: Uint8Array): Promise<void>;
  writeValueWithoutResponse?(value: Uint8Array): Promise<void>;
}

export interface BrowserBluetoothService {
  getCharacteristic(uuid: string): Promise<BrowserBluetoothCharacteristic>;
}

export interface BrowserBluetoothServer {
  connected: boolean;
  connect(): Promise<BrowserBluetoothServer>;
  disconnect(): void;
  getPrimaryService(uuid: string): Promise<BrowserBluetoothService>;
}

export interface BrowserBluetoothDevice extends EventTarget {
  id: string;
  name: string | null;
  gatt: BrowserBluetoothServer | null;
}

export interface BrowserBluetoothApi {
  requestDevice(options: {
    filters: Array<{ services: string[] }>;
    optionalServices: string[];
  }): Promise<BrowserBluetoothDevice>;
}

function getBrowserBluetoothApi(): BrowserBluetoothApi {
  if (typeof navigator === 'undefined') {
    throw new Error('Web Bluetooth is only available in a browser.');
  }

  const bluetooth = (navigator as Navigator & { bluetooth?: BrowserBluetoothApi }).bluetooth;
  if (!bluetooth) {
    throw new Error('This browser does not support Web Bluetooth.');
  }
  return bluetooth;
}

export class WebBluetoothTransport {
  private device: BrowserBluetoothDevice | null = null;
  private server: BrowserBluetoothServer | null = null;
  private writeCharacteristic: BrowserBluetoothCharacteristic | null = null;
  private notifyCharacteristic: BrowserBluetoothCharacteristic | null = null;
  private readonly notificationListeners = new Set<(value: number[]) => void>();
  private readonly disconnectListeners = new Set<() => void>();
  private readonly bluetooth?: BrowserBluetoothApi;

  constructor(bluetooth?: BrowserBluetoothApi) {
    this.bluetooth = bluetooth;
  }

  requestDevice(): Promise<BrowserBluetoothDevice> {
    const bluetooth = this.bluetooth ?? getBrowserBluetoothApi();
    return bluetooth.requestDevice({
      filters: [{ services: [DRIVE_BLE_SERVICE_UUID] }],
      optionalServices: [DRIVE_BLE_SERVICE_UUID],
    });
  }

  async connect(device: BrowserBluetoothDevice): Promise<void> {
    if (!device.gatt) {
      throw new Error('This Bluetooth device does not support GATT.');
    }

    this.disconnect();
    try {
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(DRIVE_BLE_SERVICE_UUID);
      const writeCharacteristic = await service.getCharacteristic(DRIVE_BLE_WRITE_UUID);
      const notifyCharacteristic = await service.getCharacteristic(DRIVE_BLE_NOTIFY_UUID);

      this.device = device;
      this.server = server;
      this.writeCharacteristic = writeCharacteristic;
      this.notifyCharacteristic = notifyCharacteristic;
      device.addEventListener('gattserverdisconnected', this.handleDisconnected);
      notifyCharacteristic.addEventListener(
        'characteristicvaluechanged',
        this.handleNotification,
      );
      await notifyCharacteristic.startNotifications();
    } catch (error) {
      if (this.device === device) {
        this.disconnect();
      } else {
        device.gatt.disconnect();
      }
      throw error;
    }
  }

  async write(bytes: number[], withResponse: boolean): Promise<void> {
    const characteristic = this.writeCharacteristic;
    if (!characteristic || !this.server?.connected) {
      throw new Error('Bluetooth device is not connected.');
    }

    const packet = Uint8Array.from(bytes);
    if (withResponse && characteristic.writeValueWithResponse) {
      await characteristic.writeValueWithResponse(packet);
    } else if (!withResponse && characteristic.writeValueWithoutResponse) {
      await characteristic.writeValueWithoutResponse(packet);
    } else {
      await characteristic.writeValue(packet);
    }
  }

  disconnect(): void {
    const device = this.device;
    this.resetGatt();
    device?.gatt?.disconnect();
  }

  dispose(): void {
    this.disconnect();
    this.notificationListeners.clear();
    this.disconnectListeners.clear();
  }

  onNotification(listener: (value: number[]) => void): () => void {
    this.notificationListeners.add(listener);
    return () => this.notificationListeners.delete(listener);
  }

  onDisconnect(listener: () => void): () => void {
    this.disconnectListeners.add(listener);
    return () => this.disconnectListeners.delete(listener);
  }

  private handleNotification = (event: Event): void => {
    const value = (event.target as BrowserBluetoothCharacteristic).value;
    if (!value) return;

    const bytes = Array.from(
      { length: value.byteLength },
      (_unused, index) => value.getUint8(index),
    );
    this.notificationListeners.forEach((listener) => listener(bytes));
  };

  private handleDisconnected = (): void => {
    this.resetGatt();
    this.disconnectListeners.forEach((listener) => listener());
  };

  private resetGatt(): void {
    this.notifyCharacteristic?.removeEventListener(
      'characteristicvaluechanged',
      this.handleNotification,
    );
    this.device?.removeEventListener('gattserverdisconnected', this.handleDisconnected);
    this.device = null;
    this.server = null;
    this.writeCharacteristic = null;
    this.notifyCharacteristic = null;
  }
}
