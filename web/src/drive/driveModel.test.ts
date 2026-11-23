import { describe, expect, it } from 'vitest';
import {
  clampJoystick,
  createDefaultDriveProfile,
  mixDrive,
  normalizeDriveProfile,
  normalizeDriveSettings,
  setDriveWheelType,
} from './driveModel';

describe('driveModel', () => {
  it('hồ sơ hỏng được đưa về giá trị hợp lệ', () => {
    const p = normalizeDriveProfile({ wheelType: 'x', maxLimit: 999, minPwm: 500, softAccelMs: -5, name: '  ' });
    expect(p).toMatchObject({ wheelType: 'standard', maxLimit: 255, minPwm: 255, softAccelMs: 0, name: 'Hồ sơ mới' });
  });

  it('settings rỗng → 2 hồ sơ mặc định, mức Vừa', () => {
    const s = normalizeDriveSettings(null);
    expect(s.profiles.map((p) => p.name)).toEqual(['Hồ sơ A', 'Hồ sơ B']);
    expect(s.activeLevel).toBe('medium');
  });

  it('clampJoystick giữ trong bán kính', () => {
    expect(clampJoystick(120, 0, 60)).toEqual({ x: 60, y: 0 });
  });

  it('mixDrive: standard tiến hết → 4 bánh 190; mecanum ngang → dấu theo ma trận', () => {
    const p = createDefaultDriveProfile('a', 'A');
    expect(mixDrive(p, 'medium', { x: 0, y: 1 }, 0)).toEqual({ fl: 190, fr: 190, rl: 190, rr: 190 });
    const m = mixDrive(setDriveWheelType(p, 'mecanum'), 'medium', { x: 1, y: 0 }, 0);
    expect(m).toEqual({ fl: 190, fr: -190, rl: -190, rr: 190 });
  });

  it('mixDrive: neutral input stops every wheel and reverse input produces negative PWM', () => {
    const p = createDefaultDriveProfile('a', 'A');
    expect(mixDrive(p, 'medium', { x: 0, y: 0 }, 0)).toEqual({ fl: 0, fr: 0, rl: 0, rr: 0 });
    expect(mixDrive(p, 'medium', { x: 0, y: -1 }, 0)).toEqual({ fl: -190, fr: -190, rl: -190, rr: -190 });
  });
});
