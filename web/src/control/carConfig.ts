import { WHEEL_IDS, type DriveProfile, type SpeedLevel } from '../drive/driveModel';
import type { CarConfig, WheelSigns } from '../protocol/packet';

const signs = (row: Record<(typeof WHEEL_IDS)[number], number>): WheelSigns =>
  WHEEL_IDS.map((w) => row[w]) as WheelSigns;

/**
 * Hồ sơ lái trên web -> nội dung ô CONFIG gửi xuống xe khi bấm "Lưu vào xe".
 * - trim        = "Bù công suất" từng bánh (80..100 %)
 * - minPwm      = "PWM tối thiểu (vùng chết)"
 * - invertMask  = công tắc "Đảo chiều" từng động cơ
 * - turnSpeed   = 100 %: nút QUẸO xoay bằng đúng PWM của mức tốc độ đang chọn
 * - matrix      = "Ma trận hướng"; customMatrix = người dùng đã sửa ma trận.
 *   Chưa sửa thì xe dùng công thức có sẵn theo loại xe trong code (setDriveType).
 * Thứ tự bánh FL, FR, BL, BR (web gọi bánh sau là rl/rr).
 */
export function configFromProfile(profile: DriveProfile, _level?: SpeedLevel): CarConfig {
  return {
    trim: WHEEL_IDS.map((w) => profile.motors[w].compensation) as CarConfig['trim'],
    minPwm: profile.minPwm,
    invertMask: WHEEL_IDS.reduce((m, w, i) => (profile.motors[w].inverted ? m | (1 << i) : m), 0),
    turnSpeed: 100,
    customMatrix: profile.customMatrix,
    matrix: { fwd: signs(profile.matrix.fwd), side: signs(profile.matrix.side), turn: signs(profile.matrix.turn) },
  };
}

/** So sánh 2 cấu hình (ma trận chỉ tính khi đang dùng ma trận tùy chỉnh). */
export function sameConfig(a: CarConfig, b: CarConfig): boolean {
  const base =
    a.trim.every((t, i) => t === b.trim[i]) &&
    a.minPwm === b.minPwm &&
    a.invertMask === b.invertMask &&
    a.turnSpeed === b.turnSpeed &&
    a.customMatrix === b.customMatrix;
  if (!base || !a.customMatrix) return base;
  return (['fwd', 'side', 'turn'] as const).every((k) => a.matrix[k].every((v, i) => v === b.matrix[k][i]));
}
