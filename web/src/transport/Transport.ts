import type { CarConfig, Telemetry } from '../protocol/packet';

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
  /** Chọn thiết bị + kết nối. */
  connect(): Promise<void>;
  /** Chỉ chọn thiết bị (hộp thoại của trình duyệt); null nếu Hủy/lỗi. */
  requestDevice(): Promise<{ id: string; name: string | null } | null>;
  /** Kết nối tới thiết bị đã chọn. */
  connectSelected(): Promise<void>;
  disconnect(): void;
  /** Gửi 1 gói. Trả false nếu bỏ qua (chưa kết nối hoặc lần ghi trước chưa xong). */
  send(packet: Uint8Array<ArrayBuffer>): boolean;
  getStatus(): TransportStatus;
  onStatusChange(cb: (s: TransportStatus) => void): () => void;
  onTelemetry(cb: (t: Telemetry) => void): () => void;
  /** Xe có ô CONFIG / ô TEST không (firmware cũ có thể thiếu). Chỉ đúng khi đã kết nối. */
  hasConfig(): boolean;
  hasTest(): boolean;
  /** Đọc ô CONFIG hiện tại của xe; null nếu xe không có hoặc lỗi. */
  readConfig(): Promise<CarConfig | null>;
  /** Ghi ô CONFIG (xe lưu vào flash). Lỗi -> throw. */
  writeConfig(config: CarConfig): Promise<void>;
  /** Gửi 1 gói chạy thử: wheel 0..3 = FL, FR, BL, BR; null = dừng. */
  sendTest(wheel: number | null, speed: number): boolean;
}
