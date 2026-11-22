import { describe, expect, it } from 'vitest';
import { createDefaultDriveProfile, setDriveWheelType } from '../drive/driveModel';
import { ButtonBit } from '../protocol/constants';
import { mapDrive, type DriveInput } from './mapInput';

const standard = createDefaultDriveProfile('a', 'A'); // Vừa: 190/190/190, maxLimit 255
const omni = setDriveWheelType(standard, 'omni');
const idle: DriveInput = { joystick: { x: 0, y: 0 }, rotate: 0, buttons: 0 };

describe('mapDrive', () => {
  it('đứng yên khi không chạm', () => {
    expect(mapDrive(standard, 'medium', idle)).toEqual({ y: 0, x: 0, flags: 0 });
  });

  it('đẩy hết lên: Vừa (190) → y 75, Nhanh (255) → 100, Chậm (130) → 51', () => {
    const up = { ...idle, joystick: { x: 0, y: 1 } };
    expect(mapDrive(standard, 'medium', up).y).toBe(75);
    expect(mapDrive(standard, 'fast', up).y).toBe(100);
    expect(mapDrive(standard, 'slow', up).y).toBe(51);
  });

  it('vùng chết 6 % ở giữa joystick', () => {
    expect(mapDrive(standard, 'fast', { ...idle, joystick: { x: 0.05, y: 0 } }).x).toBe(0);
  });

  it('standard: Ox là rẽ; nút quẹo không gửi bit', () => {
    const r = mapDrive(standard, 'fast', { ...idle, joystick: { x: -1, y: 0 }, rotate: 1 });
    expect(r.x).toBe(-100);
    expect(r.flags).toBe(0);
  });

  it('omni: Ox = x × V_side, không trộn xoay vào trục; kẹp theo giới hạn tối đa', () => {
    expect(mapDrive(omni, 'fast', { ...idle, rotate: 1 }).x).toBe(0);
    expect(mapDrive(omni, 'fast', { ...idle, joystick: { x: 1, y: 0 }, rotate: -1 }).x).toBe(100);
    const limited = { ...omni, maxLimit: 128 };
    expect(mapDrive(limited, 'fast', { ...idle, joystick: { x: 1, y: 0 } }).x).toBe(50);
  });

  it('omni: quẹo trái → bit 6 (0x40), quẹo phải → bit 7 (0x80)', () => {
    expect(mapDrive(omni, 'fast', { ...idle, rotate: -1 }).flags).toBe(ButtonBit.TurnLeft);
    expect(mapDrive(omni, 'fast', { ...idle, rotate: 1 }).flags).toBe(0x80);
    expect(mapDrive(omni, 'fast', { ...idle, rotate: 1, buttons: ButtonBit.Cross }).flags).toBe(0xa0);
  });

  it('mỗi nút 1 bit: CROSS → 0x20, TRIANGLE + FUNC 1 cùng lúc → 0x11', () => {
    expect(mapDrive(standard, 'medium', { ...idle, buttons: ButtonBit.Cross }).flags).toBe(0x20);
    expect(mapDrive(standard, 'medium', { ...idle, buttons: ButtonBit.Triangle | ButtonBit.Func1 }).flags).toBe(0x11);
  });

  it('nút bấm tay chỉ được bit 0..5; bit 6..7 chỉ đến từ nút quẹo', () => {
    expect(mapDrive(standard, 'medium', { ...idle, buttons: 0x3f }).flags).toBe(0x3f);
    expect(mapDrive(standard, 'medium', { ...idle, buttons: 0xff }).flags).toBe(0x3f);
  });
});
