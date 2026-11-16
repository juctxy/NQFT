import {
  CONTROL_CHAR_UUID,
  DEVICE_NAME_PREFIX,
  SERVICE_UUID,
  TELEMETRY_CHAR_UUID,
} from '../protocol/constants';
import { decodeTelemetry, type Telemetry } from '../protocol/packet';
import type { ConnectionState, Transport, TransportStatus } from './Transport';

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY_MS = 500;

export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator && !!navigator.bluetooth;
}

export class BleTransport implements Transport {
  private device: BluetoothDevice | null = null;
  private control: BluetoothRemoteGATTCharacteristic | null = null;
  private telemetry: BluetoothRemoteGATTCharacteristic | null = null;

  private status: TransportStatus = { state: 'disconnected', deviceName: null, error: null };
  private statusListeners = new Set<(s: TransportStatus) => void>();
  private telemetryListeners = new Set<(t: Telemetry) => void>();

  private writing = false;
  private userDisconnect = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  async connect(): Promise<void> {
    if (!isWebBluetoothSupported()) {
      this.setStatus({ state: 'disconnected', error: 'Trình duyệt không hỗ trợ Web Bluetooth' });
      return;
    }
    if (this.status.state !== 'disconnected') return;

    let device: BluetoothDevice;
    try {
      // Phải gọi trực tiếp từ thao tác người dùng (click).
      device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [SERVICE_UUID] }, { namePrefix: DEVICE_NAME_PREFIX }],
        optionalServices: [SERVICE_UUID],
      });
    } catch (e) {
      // NotFoundError = người dùng bấm Hủy -> không coi là lỗi.
      const cancelled = e instanceof DOMException && e.name === 'NotFoundError';
      this.setStatus({ state: 'disconnected', error: cancelled ? null : errorMessage(e) });
      return;
    }

    this.detachDevice();
    this.device = device;
    this.userDisconnect = false;
    device.addEventListener('gattserverdisconnected', this.handleDisconnected);
    this.setStatus({ deviceName: device.name ?? 'Không tên' });

    try {
      await this.openGatt('connecting');
    } catch (e) {
      // Lần kết nối đầu thất bại -> không tự kết nối lại.
      this.userDisconnect = true;
      device.gatt?.disconnect();
      this.resetGatt();
      this.setStatus({ state: 'disconnected', error: errorMessage(e) });
    }
  }

  disconnect(): void {
    this.userDisconnect = true;
    this.clearReconnect();
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect(); // sẽ kích hoạt handleDisconnected
    } else {
      this.resetGatt();
      this.setStatus({ state: 'disconnected', error: null });
    }
  }

  send(packet: Uint8Array<ArrayBuffer>): boolean {
    const chr = this.control;
    if (!chr || this.writing || this.status.state !== 'connected') return false;
    this.writing = true;
    // Bluefy / trình duyệt cũ có thể thiếu writeValueWithoutResponse.
    const write = chr.writeValueWithoutResponse
      ? chr.writeValueWithoutResponse(packet)
      : chr.writeValue(packet);
    write
      .catch((e) => console.warn('[BLE] write failed', e))
      .finally(() => {
        this.writing = false;
      });
    return true;
  }

  getStatus(): TransportStatus {
    return this.status;
  }

  onStatusChange(cb: (s: TransportStatus) => void): () => void {
    this.statusListeners.add(cb);
    return () => this.statusListeners.delete(cb);
  }

  onTelemetry(cb: (t: Telemetry) => void): () => void {
    this.telemetryListeners.add(cb);
    return () => this.telemetryListeners.delete(cb);
  }

  // ---------- nội bộ ----------

  private async openGatt(state: ConnectionState): Promise<void> {
    const gatt = this.device?.gatt;
    if (!gatt) throw new Error('Thiết bị không hỗ trợ GATT');
    this.setStatus({ state, error: null });

    const server = await gatt.connect();
    const service = await server.getPrimaryService(SERVICE_UUID);
    const control = await service.getCharacteristic(CONTROL_CHAR_UUID);
    const telemetry = await service.getCharacteristic(TELEMETRY_CHAR_UUID);

    telemetry.addEventListener('characteristicvaluechanged', this.handleTelemetry);
    await telemetry.startNotifications();

    this.control = control;
    this.telemetry = telemetry;
    this.writing = false;
    this.setStatus({ state: 'connected', error: null });
  }

  private handleTelemetry = (ev: Event): void => {
    const value = (ev.target as BluetoothRemoteGATTCharacteristic).value;
    if (!value) return;
    const t = decodeTelemetry(value);
    if (t) this.telemetryListeners.forEach((cb) => cb(t));
  };

  private handleDisconnected = (): void => {
    this.resetGatt();
    if (this.userDisconnect) {
      this.setStatus({ state: 'disconnected', error: null });
      return;
    }
    // Đang trong vòng thử lại -> để scheduleReconnect tự đếm số lần.
    if (this.status.state === 'reconnecting' || this.status.state === 'connecting') return;
    this.scheduleReconnect(1);
  };

  private scheduleReconnect(attempt: number): void {
    if (attempt > MAX_RECONNECT_ATTEMPTS || !this.device) {
      this.setStatus({ state: 'disconnected', error: 'Mất kết nối, không thể kết nối lại' });
      return;
    }
    this.setStatus({ state: 'reconnecting', error: null });
    this.clearReconnect();
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      if (this.userDisconnect) return;
      try {
        await this.openGatt('reconnecting');
      } catch (e) {
        console.warn(`[BLE] reconnect ${attempt} failed`, e);
        if (!this.userDisconnect) this.scheduleReconnect(attempt + 1);
      }
    }, RECONNECT_BASE_DELAY_MS * attempt);
  }

  private clearReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private resetGatt(): void {
    this.telemetry?.removeEventListener('characteristicvaluechanged', this.handleTelemetry);
    this.telemetry = null;
    this.control = null;
    this.writing = false;
  }

  private detachDevice(): void {
    this.clearReconnect();
    this.resetGatt();
    this.device?.removeEventListener('gattserverdisconnected', this.handleDisconnected);
    this.device = null;
  }

  private setStatus(patch: Partial<TransportStatus>): void {
    this.status = { ...this.status, ...patch };
    this.statusListeners.forEach((cb) => cb(this.status));
  }
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return `${e.name}: ${e.message}`;
  return String(e);
}
