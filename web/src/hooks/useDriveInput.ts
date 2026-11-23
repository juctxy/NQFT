import { useCallback, useEffect, useRef } from 'react';
import { mapDrive, UNKNOWN_CAR, type CarSpeedCaps, type DriveInput } from '../control/mapInput';
import type { ControlLoop } from '../control/ControlLoop';
import type { DriveProfile, SpeedLevel, Vec } from '../drive/driveModel';

/** Mỗi nút được giữ tối thiểu chừng này để chạm nhanh vẫn tới được xe (≥ 4 gói ở 30 Hz). */
const MIN_PRESS_MS = 150;

/**
 * Gom joystick / nút xoay / các nút đang giữ thành lệnh và đẩy vào ControlLoop.
 * Các nút là bitmask: giữ nhiều nút cùng lúc thì nhiều bit cùng bằng 1.
 * Dùng ref nên kéo joystick không làm render lại màn hình.
 */
export function useDriveInput(
  controlLoop: ControlLoop,
  profile: DriveProfile,
  level: SpeedLevel,
  connectedKey: string,
  car: CarSpeedCaps = UNKNOWN_CAR,
) {
  const input = useRef<DriveInput>({ joystick: { x: 0, y: 0 }, rotate: 0, buttons: 0 });
  const pressedAt = useRef(new Map<number, number>());
  const releaseTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const config = useRef({ profile, level, car });
  config.current = { profile, level, car };

  const push = useCallback(() => {
    const c = config.current;
    // speedPwm luôn ghi đè (undefined = gói 4 byte cho xe cũ).
    controlLoop.setInput({ speedPwm: undefined, ...mapDrive(c.profile, c.level, input.current, c.car) });
  }, [controlLoop]);

  // Đổi hồ sơ / mức tốc độ / vừa kết nối lại / biết thêm về xe -> tính lại lệnh.
  useEffect(push, [push, profile, level, connectedKey, car.speedPwm, car.noPwmPin]);
  // Tăng tốc mềm (trang Động cơ) làm ngay trên web, xe không cần biết.
  useEffect(() => controlLoop.setSoftAccel(profile.softAccelMs), [controlLoop, profile.softAccelMs]);

  const setJoystick = useCallback(
    (v: Vec) => {
      input.current = { ...input.current, joystick: v };
      push();
    },
    [push],
  );
  const setRotate = useCallback(
    (r: number) => {
      input.current = { ...input.current, rotate: r };
      push();
    },
    [push],
  );

  const setBit = useCallback(
    (bit: number, on: boolean) => {
      const buttons = on ? input.current.buttons | bit : input.current.buttons & ~bit;
      input.current = { ...input.current, buttons };
      push();
    },
    [push],
  );

  /** Bật bit của nút (các nút khác giữ nguyên). */
  const pressButton = useCallback(
    (bit: number) => {
      const t = releaseTimers.current.get(bit);
      if (t) clearTimeout(t);
      releaseTimers.current.delete(bit);
      pressedAt.current.set(bit, Date.now());
      setBit(bit, true);
    },
    [setBit],
  );

  /** Tắt bit của nút, nhưng không sớm hơn MIN_PRESS_MS kể từ lúc nhấn. */
  const releaseButton = useCallback(
    (bit: number) => {
      const left = MIN_PRESS_MS - (Date.now() - (pressedAt.current.get(bit) ?? 0));
      const clear = () => {
        releaseTimers.current.delete(bit);
        setBit(bit, false);
      };
      if (left > 0) releaseTimers.current.set(bit, setTimeout(clear, left));
      else clear();
    },
    [setBit],
  );

  /** Dừng ngay: thả joystick, nút xoay và mọi nút (bỏ qua tăng tốc mềm). */
  const stop = useCallback(() => {
    releaseTimers.current.forEach(clearTimeout);
    releaseTimers.current.clear();
    input.current = { joystick: { x: 0, y: 0 }, rotate: 0, buttons: 0 };
    controlLoop.resetInput();
    push();
  }, [push, controlLoop]);

  // Rời màn hình hoặc ẩn app -> dừng.
  useEffect(() => {
    const onHide = () => document.hidden && stop();
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      stop();
    };
  }, [stop]);

  return { setJoystick, setRotate, pressButton, releaseButton, stop };
}
