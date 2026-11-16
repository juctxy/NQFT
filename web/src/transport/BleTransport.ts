import {
  CONTROL_CHAR_UUID,
  DEVICE_NAME_PREFIX,
  SERVICE_UUID,
  TELEMETRY_CHAR_UUID,
} from '../protocol/constants';
import { decodeTelemetry, type Telemetry } from '../protocol/packet';
import type { ConnectionState, Transport, TransportErrorCode, TransportStatus } from './Transport';

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY_MS = 500;

export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator && !!navigator.bluetooth;
}

export class BleTransport implements Transport {
  private device: BluetoothDevice | null = null;
  private control: BluetoothRemoteGATTCharacteristic | null = null;
  private telemetry: BluetoothRemoteGATTCharacteristic | null = null;

  private status: TransportStatus = { state: 'disconnected', deviceName: null, error: null, errorCode: null };
  private statusListeners = new Set<(s: TransportStatus) => void>();
  private telemetryListeners = new Set<(t: Telemetry) => void>();

  private writing = false;
  private userDisconnect = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  async connect(): Promise<void> {
    if (!isWebBluetoothSupported()) {
      this.setStatus({
        state: 'disconnected',
        error: 'Trình duyệt này không hỗ trợ Bluetooth. Hãy mở bằng Chrome (Android) hoặc Bluefy (iPhone).',
        errorCode: 'unsupported',
      });
      return;
    }
    if (this.status.state !== 'disconnected') return;
    this.setStatus({ error: null, errorCode: null });

    let device: BluetoothDevice;
    try {
      // Phải gọi trực tiếp từ thao tác người dùng (click).
      device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [SERVICE_UUID] }, { namePrefix: DEVICE_NAME_PREFIX }],
        optionalServices: [SERVICE_UUID],
      });
    } catch (e) {
      const failure = classifyRequestError(e);
      this.setStatus({ state: 'disconnected', ...failure });
      if (failure.error) console.warn('[BLE] requestDevice failed', e);
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
      this.setStatus({ state: 'disconnected', error: `Kết nối thất bại — ${errorMessage(e)}`, errorCode: 'connection' });
    }
  }

  disconnect(): void {
    this.userDisconnect = true;
    this.clearReconnect();
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect(); // sẽ kích hoạt handleDisconnected
    } else {
      this.resetGatt();
      this.setStatus({ state: 'disconnected', error: null, errorCode: null });
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
    this.setStatus({ state, error: null, errorCode: null });

    const server = await gatt.connect();
    const service = await server.getPrimaryService(SERVICE_UUID);
    const control = await service.getCharacteristic(CONTROL_CHAR_UUID);
    const telemetry = await service.getCharacteristic(TELEMETRY_CHAR_UUID);

    telemetry.addEventListener('characteristicvaluechanged', this.handleTelemetry);
    await telemetry.startNotifications();

    this.control = control;
    this.telemetry = telemetry;
    this.writing = false;
    this.setStatus({ state: 'connected', error: null, errorCode: null });
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
      this.setStatus({ state: 'disconnected', error: null, errorCode: null });
      return;
    }
    // Đang trong vòng thử lại -> để scheduleReconnect tự đếm số lần.
    if (this.status.state === 'reconnecting' || this.status.state === 'connecting') return;
    this.scheduleReconnect(1);
  };

  private scheduleReconnect(attempt: number): void {
    if (attempt > MAX_RECONNECT_ATTEMPTS || !this.device) {
      this.setStatus({ state: 'disconnected', error: 'Mất kết nối, không thể kết nối lại. Bấm Kết nối để thử lại.', errorCode: 'connection' });
      return;
    }
    this.setStatus({ state: 'reconnecting', error: null, errorCode: null });
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

/**
 * Chrome dùng chung NotFoundError cho nhiều trường hợp khác nhau
 * (bấm Hủy, Bluetooth tắt, trình duyệt chặn API…) -> phân loại theo nội dung thông báo.
 */
export function classifyRequestError(e: unknown): { error: string | null; errorCode: TransportErrorCode | null } {
  const name = e instanceof Error ? e.name : '';
  const msg = e instanceof Error ? e.message.toLowerCase() : String(e).toLowerCase();

  if (msg.includes('cancel')) {
    return { error: null, errorCode: null }; // người dùng bấm Hủy
  }
  if (msg.includes('globally disabled') || msg.includes('blocklist') || msg.includes('disabled by')) {
    return {
      error: 'Trình duyệt này đang chặn Bluetooth (ví dụ Brave). Hãy mở app bằng Google Chrome.',
      errorCode: 'disabled',
    };
  }
  if (msg.includes('adapter not available') || msg.includes('bluetooth adapter') || msg.includes('turned off')) {
    return { error: 'Bluetooth trên điện thoại đang tắt. Hãy bật Bluetooth rồi thử lại.', errorCode: 'adapter-off' };
  }
  if (name === 'SecurityError' || name === 'NotAllowedError' || msg.includes('permission') || msg.includes('location')) {
    return {
      error: 'Chưa có quyền Bluetooth. Bật quyền "Thiết bị ở gần" (hoặc "Vị trí") cho trình duyệt, và bật Vị trí trên Android 6–11.',
      errorCode: 'permission',
    };
  }
  return { error: `Không mở được danh sách thiết bị — ${errorMessage(e)}`, errorCode: 'other' };
}
