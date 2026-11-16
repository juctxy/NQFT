import type { Telemetry } from '../protocol/packet';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

/** Loại lỗi để UI gợi ý cách xử lý phù hợp. */
export type TransportErrorCode =
  | 'unsupported' // trình duyệt không có Web Bluetooth
  | 'disabled' // có API nhưng trình duyệt chặn (Brave, chính sách…)
  | 'adapter-off' // Bluetooth của máy đang tắt
  | 'permission' // thiếu quyền Thiết bị ở gần / Vị trí
  | 'connection' // lỗi khi kết nối GATT
  | 'other';

export interface TransportStatus {
  state: ConnectionState;
  deviceName: string | null;
  error: string | null;
  errorCode: TransportErrorCode | null;
}

/**
 * Lớp giao tiếp chung. Hiện có BleTransport; sau này có thể thêm
 * WsTransport (Wi-Fi) mà không phải sửa phần còn lại của app.
 */
export interface Transport {
  connect(): Promise<void>;
  disconnect(): void;
  /** Gửi 1 gói. Trả false nếu bỏ qua (chưa kết nối hoặc lần ghi trước chưa xong). */
  send(packet: Uint8Array<ArrayBuffer>): boolean;
  getStatus(): TransportStatus;
  onStatusChange(cb: (s: TransportStatus) => void): () => void;
  onTelemetry(cb: (t: Telemetry) => void): () => void;
}
