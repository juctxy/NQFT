import { describe, expect, it } from 'vitest';
import { mapInput, withFunction, type UiControlState } from './mapInput';

const base: UiControlState = {
  mode: 'MODE_1',
  pressed: [],
  joystick: { x: 0, y: 0 },
  motor1Speed: 128,
  motor2Speed: 128,
  func: 0,
};

describe('mapInput', () => {
  it('đứng yên khi không giữ nút', () => {
    expect(mapInput(base)).toEqual({ throttle: 0, steering: 0, flags: 0 });
  });

  it('MODE 1: ▲ với Motor 1 = 128 → ga 50; 255 → 100', () => {
    expect(mapInput({ ...base, pressed: ['UP'] }).throttle).toBe(50);
    expect(mapInput({ ...base, pressed: ['UP'], motor1Speed: 255 }).throttle).toBe(100);
    expect(mapInput({ ...base, pressed: ['DOWN'], motor1Speed: 255 }).throttle).toBe(-100);
  });

  it('MODE 1: đi chéo và nút đối nhau triệt tiêu', () => {
    expect(mapInput({ ...base, pressed: ['UP', 'LEFT'] })).toMatchObject({ throttle: 50, steering: -50 });
    expect(mapInput({ ...base, pressed: ['UP', 'DOWN'] }).throttle).toBe(0);
  });

  it('Motor = 0 thì không chạy', () => {
    expect(mapInput({ ...base, pressed: ['UP'], motor1Speed: 0 }).throttle).toBe(0);
  });

  it('MODE 2: dùng joystick, bỏ qua nút hướng', () => {
    const s: UiControlState = { ...base, mode: 'MODE_2', pressed: ['UP'], joystick: { x: 100, y: -40 }, motor1Speed: 255, motor2Speed: 255 };
    expect(mapInput(s)).toMatchObject({ throttle: -40, steering: 100 });
  });

  it('Function F2 → flags 0x10', () => {
    expect(mapInput({ ...base, func: 2 }).flags).toBe(0x10);
  });
});

describe('withFunction', () => {
  it('giữ các bit khác và bỏ giá trị không hợp lệ', () => {
    expect(withFunction(0x07, 4)).toBe(0x27);
    expect(withFunction(0x3f, 0)).toBe(0x07);
    expect(withFunction(0, 9)).toBe(0);
  });
});
