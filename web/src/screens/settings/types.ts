export type SubPageId =
  | 'speed'
  | 'wheelType'
  | 'motor'
  | 'calibrate'
  | 'controllerStub'
  | 'hardwareStub'
  | 'advanced';

/**
 * Status chip kinds:
 * Chưa kết nối (gray), Đang kết nối (amber), Đã kết nối (green),
 * Chưa đồng bộ (amber), Đang kiểm tra (blue), Đang áp dụng (blue),
 * Đã áp dụng (green), Lỗi (red).
 */
export type StatusChipKind =
  | 'disconnected' // Chưa kết nối (gray)
  | 'connecting'   // Đang kết nối (amber)
  | 'connected'    // Đã kết nối (green)
  | 'unsynced'     // Chưa đồng bộ (amber)
  | 'testing'      // Đang kiểm tra (blue)
  | 'applying'     // Đang áp dụng (blue)
  | 'applied'      // Đã áp dụng (green)
  | 'error';       // Lỗi (red)

export interface CardState {
  enabled: boolean;
  reason?: string;
}

export interface DashboardState {
  connectionStatus: StatusChipKind;
  robotName: string | null;
  chipFamily: string;
  battery: string | null;
  cardStates: {
    controller: CardState;
    speed: CardState;
    wheelType: CardState;
    hardware: CardState;
    motor: CardState;
    calibrate: CardState;
    advanced: CardState;
  };
  devStatusOverride: StatusChipKind | null;
  setDevStatusOverride: (status: StatusChipKind | null) => void;
}
