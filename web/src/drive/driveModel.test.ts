import { describe, expect, it } from 'vitest';
import {
  clampJoystick,
  createDefaultDriveProfile,
  joystickDirection,
  mixDrive,
  normalizeDriveProfile,
  normalizeDriveSettings,
  snapJoystickDirection,
  setDriveWheelType,
} from './driveModel';

describe('driveModel', () => {
  it('hồ sơ hỏng được đưa về giá trị hợp lệ', () => {
    const p = normalizeDriveProfile({ wheelType: 'x', maxLimit: 999, minPwm: 500, softAccelMs: -5, name: '  ' });
    expect(p).toMatchObject({ wheelType: 'standard', maxLimit: 255, minPwm: 255, name: 'Hồ sơ mới' });
    expect(p).not.toHaveProperty('softAccelMs');
  });

  it('settings rỗng → 2 hồ sơ mặc định, mức Vừa', () => {
    const s = normalizeDriveSettings(null);
    expect(s.profiles.map((p) => p.name)).toEqual(['Hồ sơ A', 'Hồ sơ B']);
    expect(s.activeLevel).toBe('medium');
  });

  it('clampJoystick giữ trong bán kính', () => {
    expect(clampJoystick(120, 0, 60)).toEqual({ x: 60, y: 0 });
  });

  it('mixDrive: standard tiến → 4 bánh = PWM của mức; mecanum ngang → dấu theo ma trận', () => {
    const p = createDefaultDriveProfile('a', 'A');
    expect(mixDrive(p, 'medium', { x: 0, y: 1 }, 0)).toEqual({ fl: 200, fr: 200, rl: 200, rr: 200 });
    expect(mixDrive(p, 'slow', { x: 0, y: 1 }, 0)).toEqual({ fl: 140, fr: 140, rl: 140, rr: 140 });
    const m = mixDrive(setDriveWheelType(p, 'mecanum'), 'medium', { x: 1, y: 0 }, 0);
    expect(m).toEqual({ fl: 200, fr: -200, rl: -200, rr: 200 });
  });

  it('mixDrive: đẩy nhẹ cũng chạy đúng PWM của mức; chưa có chân PWM -> 255', () => {
    const p = createDefaultDriveProfile('a', 'A');
    expect(mixDrive(p, 'medium', { x: 0, y: 0.3 }, 0).fl).toBe(200);
    expect(mixDrive(p, 'slow', { x: 0, y: 1 }, 0, true).fl).toBe(255);
  });

  it('mixDrive: bánh đảo chiều cho PWM ngược dấu', () => {
    const p = createDefaultDriveProfile('a', 'A');
    const inv = { ...p, motors: { ...p.motors, fr: { inverted: true, compensation: 100 } } };
    expect(mixDrive(inv, 'fast', { x: 0, y: 1 }, 0)).toEqual({ fl: 255, fr: -255, rl: 255, rr: 255 });
  });

  it('joystickDirection: chỉ giữ hướng, thành phần lớn nhất = 1', () => {
    expect(joystickDirection({ x: 0.3, y: 0 })).toEqual({ x: 1, y: 0 });
    expect(joystickDirection({ x: 0.2, y: 0.4 })).toEqual({ x: 0.5, y: 1 });
    expect(joystickDirection({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  });

  it('snapJoystickDirection: chọn đúng 8 hướng thẳng và chéo', () => {
    const directions = [
      [{ x: 1, y: 0 }, { x: 1, y: 0 }],
      [{ x: 1, y: 1 }, { x: 1, y: 1 }],
      [{ x: 0, y: 1 }, { x: 0, y: 1 }],
      [{ x: -1, y: 1 }, { x: -1, y: 1 }],
      [{ x: -1, y: 0 }, { x: -1, y: 0 }],
      [{ x: -1, y: -1 }, { x: -1, y: -1 }],
      [{ x: 0, y: -1 }, { x: 0, y: -1 }],
      [{ x: 1, y: -1 }, { x: 1, y: -1 }],
    ] as const;

    for (const [input, expected] of directions) {
      expect(snapJoystickDirection(input)).toEqual(expected);
    }
    expect(snapJoystickDirection({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  });

  it('snapJoystickDirection: đúng ranh giới 22.5 độ luôn chọn hướng chéo', () => {
    const boundary = { x: Math.cos(Math.PI / 8), y: Math.sin(Math.PI / 8) };
    expect(snapJoystickDirection(boundary)).toEqual({ x: 1, y: 1 });
  });

  it('mixDrive: preview chéo dùng hướng đã snap thay vì tỷ lệ joystick analog', () => {
    const mecanum = setDriveWheelType(createDefaultDriveProfile('a', 'A'), 'mecanum');
    expect(mixDrive(mecanum, 'medium', { x: 0.8, y: 0.9 }, 0)).toEqual({
      fl: 200,
      fr: 0,
      rl: 0,
      rr: 200,
    });
  });

  it('mixDrive: neutral input stops every wheel and reverse input produces negative PWM', () => {
    const p = createDefaultDriveProfile('a', 'A');
    expect(mixDrive(p, 'medium', { x: 0, y: 0 }, 0)).toEqual({ fl: 0, fr: 0, rl: 0, rr: 0 });
    expect(mixDrive(p, 'medium', { x: 0, y: -1 }, 0)).toEqual({ fl: -200, fr: -200, rl: -200, rr: -200 });
  });
});
