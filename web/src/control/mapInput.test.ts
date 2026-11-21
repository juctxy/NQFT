import { describe, expect, it } from 'vitest';
import { createDefaultDriveProfile, setDriveWheelType } from '../drive/driveModel';
import { ButtonBit } from '../protocol/constants';
import { mapDrive, type DriveInput } from './mapInput';

const standard = createDefaultDriveProfile('a', 'A'); // Vừa: 190/190/190, maxLimit 255
const omni = setDriveWheelType(standard, 'omni');
const idle: DriveInput = { joystick: { x: 0, y: 0 }, rotate: 0, buttons: 0 };

describe('mapDrive', () => {
  it('đứng yên khi không chạm', () => {
    expect(mapDrive(standard, 'medium', idle)).toEqual({ throttle: 0, steering: 0, flags: 0 });
  });

  it('đẩy hết lên: Vừa (190) → ga 75, Nhanh (255) → 100, Chậm (130) → 51', () => {
    const up = { ...idle, joystick: { x: 0, y: 1 } };
    expect(mapDrive(standard, 'medium', up).throttle).toBe(75);
    expect(mapDrive(standard, 'fast', up).throttle).toBe(100);
    expect(mapDrive(standard, 'slow', up).throttle).toBe(51);
  });

  it('vùng chết 6 % ở giữa joystick', () => {
    expect(mapDrive(standard, 'fast', { ...idle, joystick: { x: 0.05, y: 0 } }).steering).toBe(0);
  });

  it('standard: trục x là lái; nút xoay không có tác dụng', () => {
    expect(mapDrive(standard, 'fast', { ...idle, joystick: { x: -1, y: 0 }, rotate: 1 }).steering).toBe(-100);
  });

  it('omni: x × V_side + xoay × V_turn, kẹp theo giới hạn tối đa', () => {
    expect(mapDrive(omni, 'fast', { ...idle, rotate: 1 }).steering).toBe(100);
    expect(mapDrive(omni, 'fast', { ...idle, joystick: { x: 1, y: 0 }, rotate: -1 }).steering).toBe(0);
    const limited = { ...omni, maxLimit: 128 };
    expect(mapDrive(limited, 'fast', { ...idle, joystick: { x: 1, y: 0 }, rotate: 1 }).steering).toBe(50);
  });

  it('mỗi nút 1 bit: SÚT → 0x20, CẢN + FUNC 1 cùng lúc → 0x11', () => {
    expect(mapDrive(standard, 'medium', { ...idle, buttons: ButtonBit.Kick }).flags).toBe(0x20);
    expect(mapDrive(standard, 'medium', { ...idle, buttons: ButtonBit.Block | ButtonBit.Func1 }).flags).toBe(0x11);
  });

  it('đủ 6 nút → 0x3F; bit 6..7 luôn bị xóa', () => {
    const all = Object.values(ButtonBit).reduce((a, b) => a | b, 0);
    expect(mapDrive(standard, 'medium', { ...idle, buttons: all }).flags).toBe(0x3f);
    expect(mapDrive(standard, 'medium', { ...idle, buttons: 0xff }).flags).toBe(0x3f);
  });
});
