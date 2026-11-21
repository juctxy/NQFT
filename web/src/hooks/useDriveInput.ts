import { useCallback, useEffect, useRef } from 'react';
import { mapDrive, type DriveInput } from '../control/mapInput';
import type { ControlLoop } from '../control/ControlLoop';
import type { DriveProfile, SpeedLevel, Vec } from '../drive/driveModel';
import { ActionCode } from '../protocol/constants';

/** Giữ mã nút hành động tối thiểu chừng này để chạm nhanh vẫn tới được xe (≥ 4 gói ở 30 Hz). */
const MIN_ACTION_MS = 150;

/**
 * Gom joystick / nút xoay / nút hành động thành lệnh và đẩy vào ControlLoop.
 * Dùng ref nên kéo joystick không làm render lại màn hình.
 */
export function useDriveInput(controlLoop: ControlLoop, profile: DriveProfile, level: SpeedLevel, connectedKey: string) {
  const input = useRef<DriveInput>({ joystick: { x: 0, y: 0 }, rotate: 0, action: ActionCode.None });
  const actionStartedAt = useRef(0);
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const config = useRef({ profile, level });
  config.current = { profile, level };

  const push = useCallback(() => {
    controlLoop.setInput(mapDrive(config.current.profile, config.current.level, input.current));
  }, [controlLoop]);

  // Đổi hồ sơ / mức tốc độ / vừa kết nối lại -> tính lại lệnh.
  useEffect(push, [push, profile, level, connectedKey]);

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
  const pressAction = useCallback(
    (code: number) => {
      if (releaseTimer.current) clearTimeout(releaseTimer.current);
      releaseTimer.current = null;
      actionStartedAt.current = Date.now();
      input.current = { ...input.current, action: code };
      push();
    },
    [push],
  );
  const releaseAction = useCallback(
    (code: number) => {
      if (input.current.action !== code) return;
      const clear = () => {
        releaseTimer.current = null;
        if (input.current.action !== code) return;
        input.current = { ...input.current, action: ActionCode.None };
        push();
      };
      const left = MIN_ACTION_MS - (Date.now() - actionStartedAt.current);
      if (left > 0) releaseTimer.current = setTimeout(clear, left);
      else clear();
    },
    [push],
  );
  /** Dừng ngay: thả joystick, nút xoay, nút hành động. */
  const stop = useCallback(() => {
    if (releaseTimer.current) clearTimeout(releaseTimer.current);
    releaseTimer.current = null;
    input.current = { joystick: { x: 0, y: 0 }, rotate: 0, action: ActionCode.None };
    push();
  }, [push]);

  // Rời màn hình hoặc ẩn app -> dừng.
  useEffect(() => {
    const onHide = () => document.hidden && stop();
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      stop();
    };
  }, [stop]);

  return { setJoystick, setRotate, pressAction, releaseAction, stop };
}
